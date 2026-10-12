# เริ่มใช้งาน Wedding Fabric Studio V2

**ใช้ ZIP ชุดนี้ก่อน** เพราะสามารถเผยแพร่ผ่าน GitHub Pages แบบ Static ได้ทันที ไม่ต้องใช้คำสั่ง npm หรือ GitHub Actions

1. สร้าง Repository ใหม่ใน GitHub เช่น `wedding-fabric-studio-v2` อย่าเพิ่งแก้ Repository `weddingCal` เดิม
2. แตก ZIP แล้วอัปโหลด `index.html` และโฟลเดอร์ `assets/` ทั้งโฟลเดอร์เข้า Root ของ Repository (ข้างใน `assets` ต้องมี app.js, engine.js, renderer.js, style.css)
3. ไปที่ Settings → Pages → Source: **Deploy from a branch** → Branch: **main** → Folder: **/(root)** → Save
4. รอสถานะการ Deploy เสร็จ แล้วเปิด `https://USERNAME.github.io/wedding-fabric-studio-v2/`

ไฟล์ `README_DEPLOY_TH.md` มีคำอธิบายเพิ่มเติม ขณะนี้แอปรองรับ Phase 1: Backdrop Drape และ Ceiling Swag
