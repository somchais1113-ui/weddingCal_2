# M1 Audit และสถาปัตยกรรม V6

## หลักฐานจากไฟล์แนบ

ZIP V5 มี 3 ไฟล์: index.html (118,296 bytes), README_DEPLOY_TH.md และ QA_REPORT.md ไม่มี PDF บรีฟหรือภาพ reference งานจริงอยู่ใน ZIP นี้ จึงใช้ Master Brief ที่ผู้ใช้ส่งเป็นเกณฑ์ V6 และสร้าง synthetic reference เพื่อทดสอบ algorithm เท่านั้น

V5 ประกอบด้วย Calculation Engine, project data, frame screening, Canvas parametric renderer และ UI ทั้งหมดใน HTML เดียว ใช้ localStorage; รองรับนำเข้า/ส่งออก JSON/CSV/PNG และ presets 7 ชุด

พบช่องว่างสำคัญ:

- เลือกกรอบสี่เหลี่ยมและ flood-fill สีเท่านั้น ไม่มี Homography หรือ Anchor เส้นโค้งที่บันทึกได้
- ผิวผ้าเป็น Mesh บน Canvas อยู่แล้ว ไม่ได้ใช้ Three.js; จึงสามารถต่อยอดและลดเงาโดยไม่เพิ่ม runtime dependency
- เหล็กใช้ first-fit decreasing แยกคาน/เสา/ค้ำยัน มีการนับ 6 ม. แต่ยังไม่มี Kerf/รายการต่อเส้นและการรวมหน้าตัดข้ามหน้าที่
- ตัว renderer มี drawPerson แต่ path การ draw หลักไม่ได้เรียกฟังก์ชันนั้น จึงต้องต่อคนอ้างอิงเข้าเส้นทางการวาดจริงของ V6
- การจัดเก็บภาพอ้างอิงกับ localStorage ไม่เป็น state เดียวกันอย่างครบถ้วน ต้องเปลี่ยนเป็น IndexedDB project record
- QA เดิมระบุการตรวจ syntax และ inherited logic แต่ไม่มี Browser evidence ที่แนบมา จึงไม่ถือเป็นหลักฐานว่า UI V5 ผ่านครบ

## การตัดสินใจ

ใช้ Vanilla ES Modules, Canvas software 3D และ Node native tests โดยไม่มี framework/runtime CDN เป้าหมายคือ static deploy, ตรวจสูตรได้ และเก็บ V5 เดิมไว้ครบ ไม่ใช้ React/Three.js เพราะไม่จำเป็นต่อการเริ่มต้นแก้ปัญหา Anchor และ Material Engine

Trade-off: software 3D ลด dependency แต่ไม่ใช่ PBR และ performance/ผ้าโปร่งยังต้อง Browser QA; ถ้าต้องการ realtime scene ใหญ่และวัสดุจริงขึ้น สามารถแทน renderer ด้วย Three.js โดยใช้ geometry/model/calculator เดิมต่อได้

## Data contract

Schema version=6:

- Project: name, scene width/height, layers, render, reference, steel, increment, laborCost, otherCost, gsm
- Layer: id, geometry shape, anchors top/bottom, transform x/y/z, depth, material, fullness, roll width, quantity, price, allowances, visible/locked, estimateMode
- Reference: original raster embedded data URL, 4 normalized corners, real W/H, calibrated flag
- Steel: kerf, section-based piece list, accessories
- Legacy import: original source snapshot + per-layer legacy parameters/buffers so old outputs remain reproducible

Coordinates: cm, X centered at stage, Y down from stage top, Z forward. Anchors normalized in the layer rectangle, handles stored with anchors. Steel uses mm, order fabric uses m, price THB

## State และ consistency

การแก้ผ่าน validate → estimate → render → history → autosave ข้อผิดพลาดคืนค่าก่อนแก้ การลาก Trace ยอมให้ preview ระหว่าง gesture แล้ว validate/commit ตอนปล่อย จะแจ้งและคืนค่าถ้าเส้นกลับด้านหรือไขว้

Geometry และ Fabric Engine ใช้ surfacePoint/outlineAt ชุดเดียวกัน ตัวคำนวณละคลื่นจีบที่แสดงผลเพื่อไม่คิด Fullness ซ้ำ แยก raw strip, seam, shrink, repeat, waste และ rounding

History เก็บ JSON snapshots จำกัด 70 สถานะ รูปอ้างอิงเก็บใน snapshot จึงอาจใช้ memory เพิ่มเมื่ออัปโหลดภาพหลายภาพ ควรปรับเป็น structural sharing หากพัฒนา multi-reference editor ต่อ

## การรักษาฟีเจอร์เดิม

V5 ทั้งชุดอยู่ใน legacy/ โดยคงไบต์เดิม เปิดได้จาก UI ส่วน V6 มี preset เดิม, mode backdrop/ceiling, ค่าแรง/อื่น ๆ, คน/แนวดอกไม้, import/export และการนับวัสดุซ่อนเช่นเดิม สูตร screening โครงสร้างเดิมยังอยู่ใน legacy tool ไม่อ้างว่าเป็น safety validation
