# QA REPORT — Wedding Fabric Studio V3

## Test status

- Pure calculations: `node --test tests/core.test.mjs` — expected 10/10 tests passed
- Static imports: relative `./assets/...`, self-contained, no remote dependencies
- JavaScript syntax: checked with `node --check` per JS file
- Github Pages setup: static branch main / root (no workflow or build required)
- Browser UI smoke: **passed** using Chromium with the HTML/CSS and JS injected into an about:blank document (same DOM, calculations and handlers; browser load of URLs restricted by administrator). Verified: two-layer start (28.50m, THB 2,962.50), add layer, modify price, upload JPG, experimental select-by-color, draw reference region (210x175cm), apply dimension to layer, export/import JSON including compressed image, export CSV, switch ceiling mode, mobile 390px without horizontal document overflow. No uncaught JavaScript errors in these flows.
- Real GitHub Pages / actual ES module network imports: **not verified within this environment**. Chromium blocks URL navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR` (including localhost). Source files and relative paths were checked separately. Please confirm successful GitHub Pages deployment. This is a browser environment policy, not evidence of an app runtime fault.

## Manual acceptance checklist for after upload

- [ ] Opening the site shows a 3D scene and summary statistics, no blank page
- [ ] Default layers show purchase total 28.50m and fabric cost THB 2,962.50 (default prices THB 95 and THB 125/m)
- [ ] Add Layer → new row and new cost; edit price → budget recalculates immediately
- [ ] Change layer color / opacity → 3D updates, quantity remains unchanged
- [ ] Toggle visibility → 3D changes, BOM remains unchanged
- [ ] Ceiling Drape → select Brief / Exact catenary and verify recalculation
- [ ] Reference tab → upload image, input actual width/height, draw rectangle → assign dimension to selected layer
- [ ] Experimental color selection → click distinct fabric color, verify bounding region; manually correct with rectangle if imperfect
- [ ] Export CSV and JSON, import saved JSON, export PNG
- [ ] Check mobile width under 390px for horizontal overflow (BOM table scrolls internally)
- [ ] Verify browser DevTools console and Network requests after GitHub deploy

## Production notes

- Theoretical cut geometry is separate from visualization; display only aids decision-making
- Fabric allowances applied once
- Photo calibration assumes a single rectified plane; does not perform full perspective correction or photogrammetry
- Distinct materials are costed per layer, rounded individually. Group procurement requires human cut-plan optimization
