// Relay for the test page: browser -> this function -> <baseUrl>/rest[/<store>]/V1/chatbot/chat-products
// Needed because Magento does not send CORS headers, so the browser cannot call it directly.
// The base URL always comes from the user; only the chat-products path can be reached.

const API_PATH = 'V1/chatbot/chat-products';
const TIMEOUT_MS = 30000;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  if (req.body !== undefined) {
    return Promise.resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100000) reject(new Error('Request too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function buildTarget(baseUrl, storeCode) {
  let url;
  try {
    url = new URL(String(baseUrl || '').trim());
  } catch (e) {
    throw new Error('Base URL is not a valid URL (example format: https://your-domain).');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Base URL must start with http:// or https://');
  }
  if (url.username || url.password) {
    throw new Error('Base URL must not contain a username or password.');
  }
  const store = String(storeCode || '').trim();
  if (store && !/^[a-z0-9_]+$/i.test(store)) {
    throw new Error('Store code may only contain letters, digits and underscores.');
  }
  const prefix = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${prefix}/rest/${store ? store + '/' : ''}${API_PATH}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { relayError: 'Use POST.' });
  }

  let input;
  try {
    input = JSON.parse((await readBody(req)) || '{}');
  } catch (e) {
    return send(res, 400, { relayError: 'Relay received invalid JSON.' });
  }

  let target;
  try {
    target = buildTarget(input.baseUrl, input.storeCode);
  } catch (e) {
    return send(res, 400, { relayError: e.message });
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input.payload ?? {}),
      redirect: 'manual',
      signal: controller.signal,
    });
    const text = await upstream.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = null;
    }
    return send(res, 200, {
      target,
      status: upstream.status,
      statusText: upstream.statusText,
      timeMs: Date.now() - started,
      body,
      rawText: body === null ? text.slice(0, 20000) : undefined,
    });
  } catch (e) {
    const reason = e.name === 'AbortError'
      ? `No response within ${TIMEOUT_MS / 1000}s`
      : `${e.message}${e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : ''}`;
    return send(res, 502, {
      target,
      timeMs: Date.now() - started,
      relayError: `Could not reach the server: ${reason}. The server may be blocking this host's IP.`,
    });
  } finally {
    clearTimeout(timer);
  }
};
