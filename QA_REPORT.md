# V3.1 Test report (2026-10-12)

## Issue / diagnosis

User screenshot: styling and dynamic inputs missing; code repository state not verified. Previous V3 HTML depended on `assets/style.css`, `assets/app.js`, and three additional JS modules. An absent or unserved asset bundle plausibly explains the UI issue. V3.1 eliminates these dependencies by inlining all CSS and JS.

## Verified locally

- 1 CSS stylesheet and 1 bundled inline JavaScript; **no external script, stylesheet or CDN dependency**.
- Chromium via Playwright `page.set_content`: desktop (1440px wide) and mobile (390px wide) render with `.layout` CSS grid; no horizontal document overflow.
- Default 2-layer estimate: 28.50m, THB 2,962.50.
- Edit base fabric price to THB 105/m: THB 3,162.50.
- Add third layer; switch to ceiling mode with confirmation; CSV export.
- Upload sample photo, draw measurement rectangle, apply region to active layer.
- No browser JavaScript page errors in the exercised checks.
- Original calculation test suite (Node.js `node --test tests/core.test.mjs`): **10/10 passed**.

## Not verified

- Actual GitHub Pages deployment, specific user's uploaded repository contents, long-duration browser compatibility, external integrations.
