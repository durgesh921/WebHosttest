# Chat Products API Tester

Standalone test page for `POST /rest/V1/chatbot/chat-products`. Not part of any repo.

- `public/index.html` – the page (base URL is always typed by the user, nothing hardcoded)
- `api/chat-products.js` – relay that forwards the request server-side (avoids browser CORS blocks).
  It can only call `<baseUrl>/rest[/<store>]/V1/chatbot/chat-products`.
- `dev-server.js` – run locally without Vercel

## Run locally

```
node dev-server.js
```
Open http://localhost:3000

## Deploy to Vercel (no git needed)

```
npx vercel login
npx vercel deploy --prod
```
Run both from this folder. Accept the defaults when asked; Vercel prints the public link at the end.
