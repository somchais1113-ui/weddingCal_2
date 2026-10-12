# V4 QA Report — 12 October 2026

## ตรวจผ่าน

- `node tests/engine.test.cjs` — **22/22 pure calculation checks ผ่าน**: Backdrop, Ceiling Catenary, Curve, Sweep, allowance, bar cut, steel gravity-only estimate, invalid-input checks
- JavaScript syntax check `node --check` — ผ่าน
- Chromium ผ่านการโหลดด้วย `page.set_content` (HTML inline) — ตัวเลขเริ่มต้นแสดง; ไม่มี uncaught JavaScript Error ในชุดทดสอบ
- Browser interaction: กดเลื่อน Layer ซ้าย/ขวา/แนวตั้ง, รีเซ็ตตำแหน่ง, เลือก Arch + เพิ่มความลึก, Sweep เปลี่ยนความยาวตัด, Move Layer ด้วยการลาก, Orbit เปลี่ยนมุมกล้อง, ราคาผ้าปรับยอดได้, เปลี่ยนขนาดเหล็กและช่วงคาน, ซ่อน/แสดงโครง, สลับโหมด Backdrop/Ceiling, CSV/JSON Export ผ่าน
- เพิ่ม/สำเนา Layer; import JSON โครงสร้าง V3 เดิม พร้อมเติมค่า V4 เริ่มต้น — ผ่าน
- รูปภาพทดสอบ PNG 640×480: อัปโหลด, แสดง Reference, ตีกรอบและนำมิติไปใช้กับ Layer ผ่าน (ตัวเลขจากสเกลผู้ใช้ ไม่ใช่ AI)
- Viewport 390px สำหรับ Mobile: ไม่มี horizontal document overflow; JavaScript Error เป็นศูนย์

## ตัวเลขตัวอย่างที่ตรวจ

- ฉาก 500×250 ซม., หน้าผ้า 150 ซม., จีบ 2 เท่า: 7 ผืน / ทฤษฎี 17.50 ม. / เผื่อ 12% เป็น 19.60 ม. / ปัดขึ้นทีละ 0.5 ม. = 20.00 ม.
- Layer เริ่มต้นของ V4 (ผ้าหลัก Straight + ผ้าซ้อน Scallop): ทฤษฎี 26.43 ม. / ซื้อรวม 30.00 ม. / ราคาผ้ารวม ฿3,150.00 (โดยประมาณตามราคาทดสอบ)
- Frame เริ่มต้น: คาน 250 ซม. จำนวน 2 ช่วง เสาสูง 260 ซม. จำนวน 3 ต้น: เหล็กคาน 6 ม. = 1 เส้น และเหล็กเสา 6 ม. = 2 เส้น (ไม่รวมค้ำยัน/เพลท/การตัดสูญเสีย)

## ยังไม่ได้ยืนยัน

- ยังไม่ทดสอบบน GitHub Pages จริงในบัญชีผู้ใช้
- ยังไม่ได้ออกแบบค้ำยัน จุดต่อ รากฐาน และไม่ได้ประเมินแรงลม / safety factor / structural code compliance
- Curve cut estimate ไม่ใช่ Cutting Pattern ใช้จริง และ Viewer ไม่ใช่ physics-based cloth simulation
- UI Browser smoke ไม่ใช่การทดสอบประสิทธิภาพบนอุปกรณ์ทุกยี่ห้อหรือการทดสอบโหลดขนาดใหญ่มาก

## คำแนะนำตรวจรับหลัง Deploy

1. เปิด URL GitHub Pages ผ่าน Browser บนอุปกรณ์ผู้ใช้จริง; ตรวจ Console/Network ไม่มี 404
2. กด Add Layer → Move Layer → Curve → เปลี่ยนราคา → ตรวจ BOM
3. เปิด Steel Frame screening ใส่ขนาดจริง แต่ห้ามนำค่าไปตัดสินรับน้ำหนักโดยไม่ได้วิศวกรตรวจ
4. ทดสอบ Export JSON และ Import กลับก่อนใช้งานจริง
