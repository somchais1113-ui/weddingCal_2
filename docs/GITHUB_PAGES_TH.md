# เผยแพร่ GitHub Pages

**ชุดนี้ยังไม่ได้เผยแพร่จริง** ไฟล์ใน `dist/` พร้อมใช้เป็น static artifact แต่ต้องผ่าน Browser Acceptance และเปิด URL หลัง Deploy ก่อนยืนยันว่าใช้งานออนไลน์ได้

## วิธีแนะนำ: Source + GitHub Actions

1. สร้างหรือเลือก repository ของคุณ นำ **เนื้อหาในโฟลเดอร์โปรเจกต์** ขึ้น root ของ branch `main` รวม `.github/workflows/pages.yml`
2. ใน Settings → Pages เลือก Source เป็น GitHub Actions
3. Push `main` หรือสั่ง workflow “Validate and deploy Wedding Fabric Studio” ด้วยตนเอง
4. Workflow รัน unit tests, build, ติดตั้ง Chromium, รัน Browser Tests แล้วเก็บ `qa-evidence` ซึ่งมีรายงานและ Screenshot
5. Deploy job ทำงานเมื่อ build-and-test ผ่านเท่านั้น ถ้า Browser Tests ล้มเหลวให้ตรวจ report และแก้ ไม่ข้าม gate เพื่ออ้างว่าส่งมอบครบ
6. เมื่อ Deploy สำเร็จ เปิด URL จาก environment `github-pages` แล้วทำ smoke test: upload → calibrate → trace → เปลี่ยนวัสดุ → export → reload/import

สิทธิ์ที่ workflow ใช้: contents:read, pages:write, id-token:write สำหรับ Pages ไม่ต้องใส่ API key ใน Source แอป

## วิธีอัปโหลดเฉพาะ Static Build

ใช้เนื้อหาของ `dist/` หรือแตก `deploy-static.zip` ลง root ของ branch สำหรับเผยแพร่ แล้วตั้ง Pages ให้ Deploy from a branch ที่ตำแหน่ง root รวม `.nojekyll` ด้วย วิธีนี้ไม่รัน QA ให้อัตโนมัติ ต้องรันชุดทดสอบแยกก่อน

App ใช้ relative asset/import paths จึงรองรับ repository subpath โดยไม่ต้องแก้ base URL รูปอ้างอิงและ JSON ตัวอย่างอยู่ใต้ `examples/` อย่าอัปโหลดเฉพาะ index.html

## ตรวจหลังเผยแพร่

- CSS/JS โหลดครบ ไม่มี 404 หรือ JavaScript exception
- ลอง upload JPG, PNG และ WEBP; ชี้มุมและลาก Anchor ทั้ง desktop/mobile
- เปิดหน้าเทียบภาพและปุ่ม Export ทั้ง 4 แบบ
- รอข้อความบันทึกในเครื่องแล้ว Reload แล้วเปิด JSON ที่ Export ไว้
- ทดสอบ 3×3,500 มม. และ 2×3,000 มม. เมื่อ Kerf=3
- ตรวจ viewport 360px, 768px, 820px และ desktop

เอกสารต้นทาง GitHub ที่ใช้ตรวจ workflow: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
