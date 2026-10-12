# Wedding Fabric Studio V3.1 — One-File Fix

## ปัญหาที่ V3.1 แก้

V3 เดิมใช้ `index.html` อ้างอิง `./assets/style.css` และ `./assets/app.js` ซึ่งนำเข้าไฟล์ `engine.js`, `project.js`, `renderer.js` อีกทอดหนึ่ง หากไฟล์โฟลเดอร์ `assets/` ไม่ได้ถูกอัปโหลด หรือพาธผิด เว็บจะไม่มี UI ตามแบบและตัวเลขจะไม่อัปเดต

V3.1 รวม CSS, Calculation Engine, Layer Renderer และ App UI ไว้ภายใน `index.html` เดียว ไม่มีไฟล์ assets หรือ CDN ที่จำเป็นในการเปิดเว็บ

## อัปเดตเว็บบน GitHub Pages

1. เปิด Repository ที่เผยแพร่หน้าเว็บ Wedding Fabric Studio อยู่
2. เลือก **Code > Add file > Upload files** หรือแก้ไฟล์ `index.html` เดิม โดยนำ `index.html` จาก ZIP นี้ไปแทนไฟล์ที่ ROOT ของ Repository (ต้องชื่อ index.html ตัวพิมพ์เล็ก)
3. Commit changes ไปยัง `main` (หากคุณ Deploy จาก branch อื่น ให้ Commit ไปยัง branch ที่ตั้งค่า Pages ไว้)
4. เปิด **Settings > Pages**: สำหรับไฟล์เดียวนี้ เลือก `Deploy from a branch` / `main` / `/(root)` แล้ว Save หากเดิมใช้ GitHub Actions ไม่จำเป็นต้องใช้ในรุ่นนี้
5. รอให้ Pages เผยแพร่เวอร์ชันใหม่ แล้ว Refresh แบบไม่ใช้ cache บน Mac: `Command + Shift + R` หรือเติม `?v=31` ต่อท้าย URL เช่น `https://USERNAME.github.io/REPO/?v=31`

> ไม่ต้องอัปโหลดทั้งโฟลเดอร์ที่หุ้ม ZIP และไม่ต้องติดตั้ง npm, ไม่ต้องใช้ React/Vite Build หรือ GitHub Actions

> ลบ `assets/` เก่าได้หลังยืนยัน V3.1 ทำงานแล้วเท่านั้น (ไฟล์ V3.1 ไม่ได้ใช้งานโฟลเดอร์นี้)

## ตรวจรับเร็ว ๆ

- เห็นส่วนตั้งค่าด้านซ้ายและพื้นที่แสดงผลผ้าทางขวาเป็นการ์ด มีพื้นหลังและระยะห่างครบ
- มีภาพผ้าซ้อน 2 สีใน Preview ที่หมุนหรือซูมได้
- ค่าตัวอย่าง: **28.50 เมตร** รวมราคา **฿2,962.50**
- แก้ราคาผ้าหลักจาก 95 เป็น 105 บาท/เมตร ยอดรวมควรเปลี่ยนเป็น **฿3,162.50**
- สลับแท็บภาพอ้างอิงและอัปโหลด JPG/PNG/WEBP ได้

## ข้อจำกัด

- การวัดจากภาพ 2D จำเป็นต้องมีขนาดอ้างอิงในโลกจริง ไม่ใช่ระบบ AI ที่อนุมานสเกล/ความลึกจากภาพเดียวได้
- ภาพ Preview เป็น Parametric Canvas Renderer ไม่ใช่ Physics Simulation
- ยังไม่ได้ทดสอบ URL ของ GitHub Pages ของคุณโดยตรง เนื่องจากยังไม่มีลิงก์ของ V3 ที่ใช้งานอยู่
- ข้อมูลโปรเจกต์ Draft เก็บบน browser storage ของแต่ละเบราว์เซอร์; สำหรับข้ามเครื่องให้ Export JSON
