# QA Report — Wedding Fabric Studio V6 RC1

วันที่ตรวจ: 12 ตุลาคม 2026

## สถานะโดยรวม

**ผ่านการทดสอบแกนระบบและ Static Build แต่ยังไม่ผ่าน Final Acceptance ทั้งหมด** Browser suite ยังไม่ได้ execute เนื่องจากไม่มี Chromium binary ในสภาพแวดล้อมนี้ และทักษะ Sites ของสภาพแวดล้อมกำหนดไม่ให้ใช้ browser path สำรองเมื่อไม่มี control-browser skill

ไม่มีการสร้าง Screenshot จำลองแล้วเรียกว่า Screenshot จากแอปจริง และไม่มีการอ้างว่า Deploy สำเร็จ

## ผลรันจริง

| การตรวจ | ผล | หลักฐาน |
|---|---|---|
| Node Automated Tests | **37/37 ผ่าน** | qa/unit-tests.tap |
| Production Static Build | **ผ่าน**, 21 ไฟล์ | qa/build-result.json, qa/build.log |
| JavaScript syntax ทุกโมดูล | ผ่านระหว่าง Build | scripts/build.mjs |
| local asset paths / module imports | ผ่าน static integrity tests | tests/static.test.js |
| Browser preflight | **BLOCKED**: ไม่พบ Playwright Chromium | qa/browser-results.json |
| Browser acceptance | **NOT RUN** — 0 tests passed | tests/browser.mjs (เตรียม suite แล้ว) |
| Desktop/Mobile Screenshots จากแอปจริง | **ไม่ได้จัดทำ** เพราะ Browser blocked | ไม่มีไฟล์ screenshot |
| Deployed URL smoke test | **ไม่ได้ทำ** ไม่มี repo/access/URL | ไม่มี deployment claim |

### Automated Tests ครอบคลุม

- Calibration ภาพตรง, ภาพเอียงจาก projective camera ที่ทราบค่าจริง, จุดภายในระนาบ, inverse transform, จุดซ้ำ/ไขว้
- Bézier handles เปลี่ยน Mesh; Catenary ใช้หน่วย cm แม้อัตราส่วนภาพต่างกัน
- ทุก shape ให้ vertex/face ที่ finite, ผ้าเพดานและ sag=0
- สูตรผ้าตรวจมือ: ตะเข็บข้าง, หดตัว, จับลาย, wastage, quantity และการปัดยอด
- Swag เพิ่มความยาวตามผิว, anchor/depth เปลี่ยนยอดวัสดุ, การเลื่อนตำแหน่งไม่ทำให้ยอดเปลี่ยน
- เหล็ก 3×3,500 มม., Kerf ที่ boundary 3,000+3,000, ชิ้นเต็ม 6 ม., ชิ้นเกิน 6 ม.
- แยกชนิด/หน้าตัด/เกรด/ความหนา, balance ต่อเส้น, ราคาขัดกัน, น้ำหนักหน้าตัด
- สูตร V5 import เท่าต้นฉบับ, presets ทั้ง 7, JSON round trip, Undo/Redo branch
- ป้องกันค่าผิด/NaN, ID ไม่ปลอดภัย/ซ้ำ, เส้น Trace กลับด้าน/ไขว้, CSV formula injection
- Entry point ID ไม่ซ้ำ, asset/import ไม่มี CDN, reference example ฝังรูปตรงกับไฟล์ที่ให้

**ข้อจำกัดของหลักฐาน:** unit tests ทดสอบ geometry/ตัวเลขและโครงสร้างไฟล์ ไม่ได้ยืนยันความแม่นของการคลิกใน Browser, CSS จริง หรือการตีความภาพผ้างานจริง; ภาพทดสอบเป็น synthetic ground truth

## Milestone Report

| Milestone | สิ่งที่พัฒนา/ตรวจได้จริง | ข้อจำกัดคงเหลือ |
|---|---|---|
| M1 Audit | อ่านครบ 3 ไฟล์ V5; แยก architecture; เก็บ V5 เดิมครบ | ไม่มี PDF/ภาพอ้างอิงงานจริงใน ZIP |
| M2 Calibration + Tracing | Homography, image warp, anchors/handles/roles, project persistence implementation; geometry tests ผ่าน | Upload/drag/warp ใน Browser ยังไม่ยืนยัน |
| M3 Geometry + Rendering | Parametric meshes, 7 styles+trace, clean lighting, cameras/picking/move/scale, UI responsive code | Browser visuals, overlap และ mobile FPS ยังไม่ตรวจจริง |
| M4 Fabric + Steel | Panel allowances, legacy migration, BFD+Kerf+cut plan+CSV; numeric tests ผ่าน | แผนตัดผ้ายังไม่ใช่แพทเทิร์นผลิต, ไม่ certify โครงสร้าง |
| M5 UX + Tests | 37 automated tests ผ่าน; Browser suite + CI gate เขียนแล้ว | **ยังไม่จบ: Browser tests และ screenshots blocked** |
| M6 Build + Deployment | Static build และแพ็กเกจ Source/Docs/QA สำเร็จ | **ยังไม่จบ: public URL verification ไม่ได้ทำ** |

## Acceptance Criteria รายข้อ

| # | ข้อกำหนด | สถานะ |
|---|---|---|
| 1 | UI ครบ ไม่มี CSS/asset ผิด | paths ผ่าน; UI ยังไม่ตรวจ Browser |
| 2 | Upload + Perspective | implemented + transform tests ผ่าน; interaction pending |
| 3 | สร้าง/แก้/บันทึก Anchor | model/roundtrip tests ผ่าน; pointer/storage Browser pending |
| 4 | Trace สร้าง editable geometry | geometry tests ผ่าน; end-to-end Browser pending |
| 5 | แก้ geometry แล้วคำนวณเปลี่ยน | unit tests ผ่าน; UI binding pending |
| 6 | ภาพตรง/เอียงเทียบพิกัดจริง | synthetic mathematical fixtures ผ่าน; image UI overlay pending |
| 7 | Steel cut plan ต่างจากการปัดยอดรวม | ผ่านกรณี 3×3,500 มม. และ Kerf boundary |
| 8 | Export BOM/Cut List/JSON/PNG | โค้ดและ CSV tests มี; Browser downloads pending |
| 9 | Reload เปิดแก้ต่อได้ | IndexedDB implementation มี; reload Browser pending |
| 10 | ไม่มี critical JS errors + build | build/syntax ผ่าน; runtime Browser errors ยังไม่ยืนยัน |

## วิธีปิด QA gap

รัน `npm install`, `npx playwright install chromium`, `npm run build`, `npm run test:browser` บนเครื่องที่มี Browser support ชุดทดสอบจะเรียกเว็บที่ build จริงและสร้าง desktop.png, reference-comparison.png, tablet.png, android-s22.png และ fold5.png พร้อม report หากผ่าน จากนั้นต้องเปิดและทดสอบ URL หลัง Deploy จริงอีกครั้ง

ชื่อ screenshots ด้านบนเป็น **ผลลัพธ์ที่ script จะสร้างเมื่อรันได้** ไม่ใช่รายการไฟล์ที่มีแล้วในแพ็กเกจนี้
