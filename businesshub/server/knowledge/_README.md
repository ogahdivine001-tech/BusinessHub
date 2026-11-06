# BusinessHub help content

These markdown files are the ONLY source the help assistant and the Help Center use. Edit them like normal documents.

## Rules
1. **Never type a plan limit, price, day count or fee by hand.** Write a fact placeholder instead, e.g. `{{plans.starter.products}}` or `{{billing.starterPrice}}`. The server fills it in from the same settings that enforce the limit, so the help can never disagree with the product. The full list of facts is in `server/services/knowledgeFacts.js`.
2. Only write what the product really does. If a feature is not built yet, say so, or leave it out.
3. Each file needs a header like this:

```
---
title: Plans, pricing and billing
category: Plans & billing
audience: public
tags: subscription, upgrade, renew
updated: 2026-11-01
---
```
`audience` is `public` (shown to everyone in the Help Center) or `seller` (only to logged-in sellers and the in-app assistant).
4. Use `## ` headings, and phrase them as people would ask ("Why can't I create an invoice?"). Each section is searched separately.
5. Files starting with `_` (like this one) are ignored.
6. After editing, run `npm run kb:check` in the server folder. It fails if a placeholder is misspelled or a header is missing.
7. Restart the server to load changes (the files are read at startup).
