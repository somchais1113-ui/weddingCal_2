# V2 QA Report — 12 October 2026

## Verified

- Node.js independent calculation tests: **7/7 passed** (`node --test tests/core.test.js`)
- Static scripts (`engine.js`, `renderer.js`, `app.js`): `node --check` passed
- Static Edition UI executed in headless Chromium from an offline injected-script page with **no page errors**:
  - Backdrop default: **17.50 m theoretical / 20.00 m purchased**
  - Ceiling 400 cm span, 80 cm sag × 3: **13.44 m theoretical** in brief mode
  - Ceiling 400 cm span, sag 0 × 3: **12.00 m theoretical**
  - Full-page screenshot produced (see companion `Fabric_Studio_V2_Preview.png` download)

## Not verified

- Remote GitHub Pages publication: user must publish package to own repository
- React/Vite `npm install`, Vitest execution, production `npm run build`: npm registry was unreachable in the creation environment
- React Three Fiber WebGL render was not browser-verified here

## Risk / limitations

- Static Edition uses a self-contained Canvas 2D projection renderer; React Source Edition uses Three.js/R3F.
- The brief's ceiling formula is an approximation; catenary geometry may produce another length. UI exposes both.
- Purchasing quantities assume fabric supplied by linear metre at selected width and no panel-tail joins.
- Browser persistence is local-only; not an online collaboration system.
