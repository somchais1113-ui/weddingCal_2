# ข้อจำกัด V6 RC1

1. **Browser Acceptance ยังไม่รันสำเร็จ** ไม่มี Chromium พร้อมใช้; ไม่มี Desktop/Mobile Screenshot จริง จึงยังไม่ยืนยัน CSS, pointer gestures, download, IndexedDB reload และ critical browser JS errors ของ workflow ทั้งหมด ผล preflight อยู่ใน `qa/browser-results.json`
2. **ยังไม่ Deploy** ไม่มี GitHub repository/สิทธิ์ในงานนี้ ไม่มี production URL ให้ตรวจ
3. ไม่ใช้ AI segmentation, ไม่อนุมาน depth หรือ scale; ผู้ใช้ระบุมุม ขนาดและเส้นเอง
4. Homography ใช้กับระนาบเดียว ไม่มี lens correction; ผ้าพอง/ภาพบดบัง/มุมมองหลายระนาบต้องใช้การวัดเพิ่ม
5. Trace รองรับเส้นบนและล่างซ้ายไปขวา ไม่รองรับ loop, รูเจาะ หรือหลายส่วนแยกใน Layer เดียว แบ่งเป็นหลาย Layer แทน
6. Parametric Mesh / Canvas software 3D ไม่ใช่ physics cloth simulation หรือ PBR renderer; roughness/transparency เป็นการประมาณด้วยสี/alpha การซ้อนผ้าโปร่งและหน้า Mesh ที่ตัดกันอาจมี painter sorting artifacts
7. ปุ่ม Clean/Soft/Presentation เป็นการปรับแสงพื้นฐาน รอยจีบและสี ไม่รับประกัน photorealism หรือความตรงภาพถ่าย
8. จุดแขวน/ผูก/รวบ/ปล่อยเป็น metadata กำกับตำแหน่ง ไม่ได้แก้สมดุลแรงตามบทบาทจุด
9. Fabric envelope ไม่ใช่แพทเทิร์นตัดจริงที่คลี่แบบไม่ยืด ต้องตรวจโดยช่าง ยังไม่รวม nesting เศษ, ทิศเส้นด้ายเฉียง, การยืดและโค้งรุนแรงที่อยู่ระหว่างจุด sampling
10. BFD ให้ feasible cut plan ไม่รับรอง global optimum; ไม่รวม end trim, มุมตัด/รอยบาก; ไม่อนุญาต auto-splice
11. Steel preview เป็นกรอบอ้างอิงพื้นที่ฉาก ไม่ได้สร้าง drawing จากรายการชิ้นเหล็ก, ไม่มีการรับรองความปลอดภัย ค่าคัดกรองคานอย่างง่ายเดิมยังเปิดดูผ่าน V5 ได้ แต่ไม่ใช่ safety check
12. V5 ยอดคำนวณรักษาผ่าน legacy mode; geometry/camera ไม่ใช่ pixel-identical; V6 model ไม่สามารถเปิดกลับใน V5 ได้ครบ
13. ข้อมูลเก็บในเบราว์เซอร์ ไม่มีบัญชี/Cloud Sync; ควร Export JSON เพื่อสำรอง
14. รองรับ auto mesh quality แต่ยังไม่ profile FPS, touch/pinch และหน่วยความจำบน S22/Fold5 จริง; Orbit/Pan เป็น pointer เดียวและ Zoom ด้วย wheel/ปุ่ม (ไม่มี pinch สองนิ้ว)
15. Quantity แสดง 1 ชุดในพรีวิวและคูณใน BOM ไม่ได้สร้างวัตถุซ้ำใน viewport; ลายผ้าคิดเฉพาะ repeat ตามแนวยาว
16. ภาพตัวอย่างเป็นภาพสังเคราะห์พร้อมจุดที่ทราบพิกัด ไม่ใช่ภาพงานแต่งจริงที่ผู้ใช้นำมาให้ V6 ถอดแบบ
