# AI assistant — setup

The chat widget is already on the site and **works offline immediately** (it answers
from `assistant-data.js`). To switch on the real-AI tier, deploy the relay on Vercel.

## What goes where
- **In the public repo (safe):** `assistant.js`, `assistant-data.js`, the widget CSS, and
  `api/chat.js`. None of these contain your API key.
- **NOT in the repo:** your Anthropic API key. It lives only as a Vercel **Environment Variable**.

## Steps
1. Get an API key from https://console.anthropic.com (Settings → API Keys).
2. Put this project on Vercel:
   - Import the GitHub repo at https://vercel.com/new, **or**
   - run `npm i -g vercel && vercel` in the project folder.
   Vercel auto-detects the `api/` folder and turns `api/chat.js` into a function at `/api/chat`.
3. In the Vercel dashboard → your project → **Settings → Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`  ·  Value: your key  ·  Environments: Production (+ Preview)
   Then redeploy.
4. Edit **`assistant.js`** line ~14 and set the endpoint to your function URL:
   ```js
   const ASSISTANT_ENDPOINT = "https://YOUR-APP.vercel.app/api/chat";
   ```
   Commit & redeploy. The widget now tries Claude first and falls back to offline if it ever fails.
5. (Recommended) In `api/chat.js`, fill `ALLOWED_ORIGINS` with your real domain(s) so only your
   site can call the relay.

## Staying on GitHub Pages?
GitHub Pages can't run functions, so either:
- deploy the **whole site** to Vercel (it serves the static files *and* the function), or
- keep the site on GitHub Pages and deploy **only** the function on Vercel, then point
  `ASSISTANT_ENDPOINT` at that Vercel URL (CORS is already handled).

## Notes
- Model is `claude-sonnet-4-6` (fluid answers). Change `MODEL` in `api/chat.js` if you like —
  e.g. `claude-3-5-sonnet-latest` for broad availability or `claude-haiku-4-5` for the lowest cost.
- The assistant does **not** scrape LinkedIn / ResearchGate / Scholar live (those sites block
  automated access). Instead, the relevant public information is compiled into the knowledge base
  (`assistant-data.js`) and the relay's `PROFILE`, so answers are instant and reliable. When a
  question isn't covered, the assistant replies "Sorry, I'm not able to answer that."
- The chat shows a short "thinking" animation (~1.5–2.5 s) before each answer, and can be
  minimised (–) or closed (×) at any time; the conversation is kept when minimised.
- The relay has a basic per-instance rate limit and optional origin allow-list.
- To update what the assistant knows, edit `assistant-data.js` (offline tier) and the
  `PROFILE` block in `api/chat.js` (AI tier) — keep them roughly in sync.
- Leaving `ASSISTANT_ENDPOINT = ""` keeps the assistant fully offline.
