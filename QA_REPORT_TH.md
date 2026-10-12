# QA Report — Wedding Fabric Studio V6 RC2

วันที่ตรวจ: 12 ตุลาคม 2026

## ผลที่ตรวจได้จริง

| รายการ | ผล |
|---|---|
| ZIP source | ตรวจเนื้อหา ZIP แตกไฟล์ครบ ไม่เสียหาย |
| Node automated tests | **40/40 ผ่าน** (37 เดิม + 3 กรณี RC2) |
| Static Build | **ผ่าน** ตรวจ JavaScript syntax และ Relative Asset paths |
| Bézier subdivision | ทดสอบความตรงกันของเส้นก่อน/หลังแบ่งช่วง 101×2 ตัวอย่างต่อช่วง ผ่าน |
| Anchor สูงสุด | 120 จุดต่อเส้น, Test Part ขนาดเล็กคำนวณได้ |
| Steel optimizer | Unit Tests เดิมครอบคลุม Stock 6,000 มม., kerf, sections และคำนวณไม่ใช่ปัดยอดรวม |
| Chromium UI smoke (แบบ HTML inline) | เปิดแอป, แก้โครงเหล็กเบื้องต้น, อัปโหลดภาพสังเคราะห์, Calibration, สร้าง Trace, เพิ่มจุดสองขอบ, Zoom และสรุป Realtime ผ่าน ไม่พบ `pageerror` |
| Browser acceptance suite บน HTTP จริง | **ยังไม่ได้รันครบ**: สภาพแวดล้อมปิดกั้นการนำทางไป local HTTP / file URL; ทดสอบด้วยการฉีด HTML และ ESM ผ่าน Data URL แทน |
| IndexedDB save/reload | **ยังไม่ยืนยัน** ด้วยวิธีทดสอบ inline เพราะ origin นี้ปฏิเสธ IndexedDB (ไม่สรุปว่าเป็น bug ของเว็บที่เผยแพร่จริง) |
| GitHub Pages | **ยังไม่ได้ Deploy/เปิดตรวจ URL จริง** |

## จุดที่แก้จากการตรวจ RC2

1. สร้าง `deploy-static.zip` ใหม่จาก `dist/` ที่มี source และ asset ใหม่จริง (ไฟล์เดิมก่อนแก้เป็น Build เก่า)
2. แก้วิธีแทรก Bézier Anchor ด้วย De Casteljau เพื่อไม่ให้รูปร่างเปลี่ยนหลังเพิ่มจุด
3. ปรับให้ Trace Properties ใช้ค่าคำนวณล่าสุดก่อนแสดงผล
4. เปลี่ยน Auto Steel Frame ให้แบ่งช่วงคานเบื้องต้นที่ไม่เกิน 2.5 เมตร (หากชิ้นส่วนยาวเกิน 6 เมตร จะไม่อนุญาตให้คิดต่อเหล็กเอง)

## Known limitations

- การ Trace เป็นการกำหนดจุดด้วยมือและประมาณรูปร่างจากเส้นขอบ ไม่ใช่การถอดผ้าจากภาพอัตโนมัติ
- ดอกไม้ใช้สัญลักษณ์ 2D ไม่ใช่ดอกไม้ 3D จริงหรือ BOM สำหรับซื้อ
- รูปคนใช้ภาพอ้างอิงพร้อมพื้นหลังต้นฉบับ ยังไม่มีระบบ Cutout พื้นหลังในเฟสนี้
- การคำนวณเหล็กเป็น Cutting Stock Plan เท่านั้น **ไม่ได้ทดสอบแรงลม ความแข็งแรงของรอยต่อ ค้ำยัน ฐานรับแรง หรือความปลอดภัย**
- แนะนำเปิด `deploy-static.zip` บน GitHub Pages จริงเพื่อตรวจ UI และ Storage อีกครั้ง

## คำสั่งทดสอบ

`npm test`
`npm run build`
`npm run test:browser` (ต้องติดตั้ง npm deps และ Playwright Chromium)
