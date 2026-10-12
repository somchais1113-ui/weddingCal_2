# Wedding Fabric Studio V6 RC1

Read [README_TH.md](README_TH.md) for setup, workflow and calculations.

Status: core automated tests and static build passed. Browser acceptance and real browser screenshots remain blocked in the delivery environment; deployment has not been performed. See [QA_REPORT_TH.md](QA_REPORT_TH.md) and [KNOWN_LIMITATIONS_TH.md](KNOWN_LIMITATIONS_TH.md).

```bash
npm test
npm run build
npm run dev
```

Runtime: dependency-free ES modules + Canvas. Browser tests optionally require Playwright/Chromium.
