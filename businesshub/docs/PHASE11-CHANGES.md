# Phase 11 — BusinessHub Assistant and Help Center

## What was built
| Piece | What it does |
|---|---|
| **Help Center** (`/help`) | Public, searchable help that works without login and without any AI. 15 articles, 89 searchable sections. Linked in the site menu and in the dashboard's Help & Support window. |
| **BusinessHub Assistant** (dashboard → AI Assistant) | An AI chat answering from the Help Center plus a short summary of *the caller's own* plan. Remembers the last few turns. Shows "Related help" links for the articles it used. |
| **Honest fallback** | If the AI is switched off, times out or errors, the person gets the best-matching help text instead, clearly labelled as coming from the Help Center and not from the AI. |
| **One source of truth** | Plan limits, prices, trial and billing days, link lifetimes, the verification fee and review rules are **filled into the help text from the same settings the server enforces**. Changing `STARTER_PRODUCT_LIMIT` or the fee changes the help automatically. The pricing page and Settings plan cards now read the same live data (`GET /api/plans`), with the old text only as a fallback. |
| **Shared AI enforcement** | The assistant and the existing AI tools use one function (`services/aiQuota.js`) for plan access and monthly counting, so a rule can't be enforced in one place and forgotten in another. |

## Plan access (as specified)
Free: AI chat not included. Starter: chat included. Pro: chat and marketing tools. Free accounts still have the full **Help Center** (no AI needed), so nobody is left without help. If you actually want the support assistant open to Free accounts too, that's a one-line change; I read your notes as gating the *AI business chat*.

## How it is kept safe
- **No tools, no database access.** The assistant can't change settings or read customers, orders, payments or other accounts. It only sees help excerpts and a tiny summary of the caller's own account: plan, expiry, product count, included features, verification status, whether email is confirmed, delivery setting. **No names, emails, phones, bank details or customer data are sent** (tested).
- **Prompt-injection handling:** user text never enters the system prompt; a forged "system" turn in the chat history is dropped; history is capped (6 turns, 1,000 characters each); the rules tell the model that messages and excerpts are information, not instructions. This reduces the risk; it cannot be a guarantee with any language model.
- **No invented facts:** the model is told to answer BusinessHub questions only from the excerpts/account facts, to say so when unsure, and never to suggest BusinessHub collects order payments. Questions unrelated to BusinessHub return no help excerpts rather than a forced match.
- **Honest identity:** it says it is an AI using a third-party model. It never claims BusinessHub trained one.
- **Limits:** AI requests are capped at 10/minute/IP; a failed answer is not counted; 30-second provider timeout (previously none); usage records keep only the first 200 characters of a question.
- **Help Center** serves only `public` articles, is read-only, rate-limited (60/min), and rejects odd article ids.

## Maintaining the help (no developer needed for wording)
Edit the markdown files in `server/knowledge/` (see `_README.md` there). Never type a limit, price or day count by hand: use a placeholder such as `{{plans.starter.products}}`. Run `npm run kb:check` after editing; restart the server to load changes. A test fails if a plan number, price or duration is hand-typed in an article, or if the "fixed rules" quoted in help (upload size, link lifetimes…) stop matching the code.

## Problems found along the way
1. **The old in-app help told sellers they could "accept card, bank transfer and mobile money payments directly through BusinessHub" via Paystack. That is not true:** Paystack is only used for BusinessHub plans and the verification fee. The old text is replaced and a test guards against its return.
2. **The Terms of Service don't match how billing works.** They say plans are "billed monthly" and can be "cancelled or downgraded at any time from your account settings". In reality each payment buys 30 days manually, and there is no cancel or downgrade screen. I did not edit the legal text; please have it reviewed. The Privacy Policy already names an AI provider; you may want to add that support questions typed into the assistant are sent to it too.
3. The AI provider call had no timeout (fixed). Settings showed customers a message naming server environment variables when Paystack wasn't set up (now generic).

## Deploy
1. Deploy server, then client. No database changes or migrations.
2. Make sure an AI provider key is set as before (`AI_PROVIDER` and its key). If none is set, the assistant still works in help-only mode.
3. `cd server && npm run kb:check` should print "All good."
4. Try it as a Starter/Pro account: ask "How do I renew my plan?", then "and for Pro?" (follow-up), then something unrelated. Try as a Free (new) account: the assistant is locked, the Help Center works.

## Rollback
Redeploy the previous build. Nothing in the database changed.

## Verified vs not verified
- **Verified:** 156/156 server tests pass. The real assistant handler runs against stand-ins and covers plan enforcement, no personal data sent to the provider, prompt-injection attempts, provider failure and empty answers, quota give-back and help-only fallback. Search is tested on 31 realistic questions (all found in the top 3) and 8 unrelated ones (none forced). Client builds; the new pages render; the article renderer was fed hostile markdown and produced no script tags, event handlers or `javascript:`/`data:` links.
- **Not verified:** no real AI provider was called, so answer quality, tone and whether the model follows the rules are **untested**: try it with real questions, including attempts to make it misbehave, before announcing it. Nothing was run in a browser or on a phone. Search is keyword-based; it understands wording found in the articles, not meaning, so unusual phrasing may miss (the question list in `tests/step6.test.js` is where to add cases).

## Known limitations
- The chat is open-ended, so a Starter user can ask it for marketing copy; only the structured Marketing page is Pro-only.
- Help text is read when the server starts; edits need a restart.
- Search can't spell-correct ("invoce" finds nothing).
