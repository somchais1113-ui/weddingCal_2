# Wedding Fabric Studio V2 — ชุดพร้อมเผยแพร่ GitHub Pages (ไม่ต้อง Build)

**แพ็กเกจนี้ใช้งานได้โดยไม่ต้อง npm, React, Vite, GitHub Actions หรือ CDN** สามารถใช้กับเว็บโฮสต์ที่เสิร์ฟไฟล์ HTML/CSS/JS ปกติได้

## วิธีอัปโหลดขึ้น GitHub Pages (แนะนำ)

1. แตก ZIP `Wedding_Fabric_Studio_V2_STATIC_Ready.zip` จะเห็น `index.html` และโฟลเดอร์ `assets/` อยู่ด้านใน
2. เปิด github.com → กด **New repository** ตั้งชื่อ `wedding-fabric-studio-v2` (แนะนำให้ใช้ Repo ใหม่ แยกจาก `weddingCal`)
3. อัปโหลด **ทั้งโครงสร้าง** ลงที่ **Root ของ Repository**: ต้องเห็น `index.html` ที่ Root และ `assets/app.js`, `assets/engine.js`, `assets/renderer.js`, `assets/style.css` อยู่ภายในโฟลเดอร์ `assets`
   - ถ้า GitHub Web ทำให้โฟลเดอร์หาย ให้ใช้ GitHub Desktop แล้วลากโฟลเดอร์โปรเจกต์เข้ามาและ Commit/Push
4. ไปที่ **Settings → Pages → Build and deployment**
5. เลือก `Source = Deploy from a branch`, `Branch = main`, `Folder = / (root)` แล้วกด Save
6. รอการเผยแพร่ในแท็บ **Actions** แล้วเปิด `https://USERNAME.github.io/wedding-fabric-studio-v2/`

**อย่าเลือก Source = GitHub Actions สำหรับ ZIP ชุด Static นี้** เพราะเราไม่ได้ส่ง Workflow มาให้ และไม่จำเป็นต้อง Build

## เช็กเมื่อเว็บเป็นหน้าขาว

- Root ต้องมี `index.html` ไม่ใช่ ZIP file
- Root ต้องมีโฟลเดอร์ `assets` ที่มี 4 ไฟล์ดังกล่าว
- ใน Browser Developer Tools → Network ตรวจว่า `assets/app.js`, `assets/engine.js` และ `assets/renderer.js` โหลดได้ (HTTP 200)
- GitHub Pages URL ต้องมีชื่อ Repository ครบ

## พื้นฐานทางวิศวกรรม

- สูตรคำนวณเดียวกับ React Source (`assets/engine.js`) และทดสอบ Node.js 7 กรณีผ่าน
- 3D preview ของ **Static Edition** ใช้การฉาย parametric geometry บน Canvas 2D ด้วย JavaScript ล้วน เพื่อให้เผยแพร่ได้โดยไม่ต้อง Build
- React Source Edition อีกชุดใช้ **React Three Fiber / Three.js** ตามบรีฟ ซึ่งรองรับการพัฒนาต่อและการเรนเดอร์ด้วย WebGL
- ภาพพรีวิวไม่ได้ทำ physics simulation ผ้าจริง
- ประวัติใช้ localStorage ใน Browser เครื่องปัจจุบัน ไม่มี backend
- มี 2 ส่วนใน Phase 1 ได้แก่ Backdrop และ Ceiling Swag เท่านั้น

## ตัวอย่างผลลัพธ์

ฉากหลัง 500 × 250 ซม., หน้าผ้า 150 ซม., จีบ 2 เท่า → 7 ผืน → ทฤษฎี 17.50 เมตร → รวม Buffer 12% เป็น 19.60 เมตร → สั่งซื้อปัดขึ้นครั้งละ 0.5 ม. เป็น 20.00 เมตร
