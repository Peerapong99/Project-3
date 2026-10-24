# HomeMatch — Audit Fixes

วันที่: 16 ตุลาคม 2026 (Asia/Bangkok)

## การเปลี่ยนแปลง

- C-01: รีเซ็ตรหัสผ่านเพิ่ม tokenVersion แบบ atomic ทำให้ JWT เก่าใช้ไม่ได้
- พบเพิ่มระหว่างแก้: offerRoutes เคย verify JWT แยกและไม่ตรวจ ban/tokenVersion เปลี่ยนเป็น protect/allowRoles กลาง พร้อม regression
- C-02: สร้าง/ตอบรับข้อเสนอผ่าน seller transaction เดียวกับงานประกาศ ป้องกัน accepted หลายรายการจาก concurrent requests; ราคา offer ต่ำกว่า 1 คืน 400
- C-03/C-13: นัดหมายใช้วันที่และเวลา Asia/Bangkok ตรวจ past time, serialize slot ตาม seller และเปลี่ยนสถานะพร้อม notification ใน transaction; notification failure rollback ทั้งรายการ
- C-04: Favorites แยกตาม account ID และ serialize writes ป้องกัน concurrent read-modify-write สูญหาย ไม่ย้ายรายการ legacy ที่ระบุเจ้าของไม่ได้ไปบัญชีใดโดยอัตโนมัติ
- C-05: ลบประกาศแบบ soft delete เก็บ document/ประวัติไว้ ซ่อนจาก find/count ปกติ และยกเลิก pending offers กับ pending/confirmed appointments ใน transaction; ปิดขายยกเลิกงานค้างเช่นกัน
- C-05: เพิ่ม DELETE /room-designs/:designId ที่ตรวจ owner และ Mobile MyDesigns ใช้ endpoint นี้ จึงลบแบบได้แม้ Property ถูกลบไปก่อนแล้ว
- C-06/C-07: ตรวจ layout แบบ strict, unique instance IDs, finite/nonnegative dimensions, array/string limits, floor/room ที่มีจริง และ expectedUpdatedAt สำหรับการแก้ไข; Mobile เก็บ version และมีตัวเลือกโหลดใหม่เมื่อชนกัน
- C-08: แก้ Web lint errors, Mobile hook dependency/StatusBar types และ Jest transforms/native mocks; App smoke test โหลด navigation จริงพร้อม teardown
- C-09: response interceptors จัดการ expired/revoked/banned sessions; ไม่ล้าง session เพราะ network error; error จาก token เก่าไม่ล้างบัญชีใหม่
- C-10: แสดงว่าขนาดห้องใน customizer เป็นขนาดจำลอง ไม่อ้างว่าเป็น geometry จริง
- C-12: API origin รวมศูนย์, Web VITE_API_ORIGIN หรือ same-origin production, Backend CORS_ORIGINS; Mobile build-time origin, iOS/Android development defaults แยกกัน
- C-14: ตัวเลือก Mobile จำอีเมลมีผลจริง และเปลี่ยนข้อความให้ตรงกับพฤติกรรม
- C-15: resource state ผูกกับ endpoint/revision ล้างข้อมูลเก่าเมื่อ filter/page เปลี่ยน และป้องกัน polling request ซ้อน
- SEC-02: เพิ่ม bounded per-process auth/account/upload rate limits พร้อม Retry-After (หลาย worker ยังต้องมี shared edge limit)
- SEC-04/06: ตรวจ image signature กับ MIME ก่อนรับไฟล์, ล้างไฟล์ที่ตรวจไม่ผ่าน และเก็บ MediaUpload owner metadata; property create/edit ตรวจเจ้าของรูปใหม่ รวมรูปห้อง/แปลน โดยคงไฟล์เดิมของประกาศ legacy ได้
- SEC-10: Map popup ใช้ DOM textContent แทน HTML string sink
- SEC-11: Android release ใช้ signing variables แยกจาก debug และบังคับ HTTPS origin/credentials ก่อน release task
- SEC-12: unexpected server errors คืน 500/generic message; validation errors คง 4xx
- Performance: Web pages โหลดแยกตาม route ด้วย lazy/Suspense แทน bundle รวมก้อนเดียว
- UX: เชื่อม label/input ของฟอร์มที่จับคู่ได้ และเพิ่ม focus trap, Escape และ focus restoration ใน user moderation dialog

## ผลตรวจล่าสุด

| Check | ผล |
|---|---|
| Backend node --test tests/*.test.js | ผ่าน 47/47 reported tests รวม subtests |
| Web lint | ผ่าน 0 errors |
| Web production build | ผ่านกับโค้ดล่าสุด; แยกโหลด pages ตาม route ลด initial bundle |
| Mobile lint | ผ่าน 0 errors, 35 warnings ที่ไม่ปิดกฎทิ้ง |
| Mobile TypeScript --noEmit | ผ่าน |
| Mobile Jest | ผ่าน 4 suites / 4 tests: App navigation, drag regression, Favorites, stale/expired session |
| Android assembleDebug --offline | ผ่าน รวม compile HomeMatchConfigModule |
| Source import/encoding scan | ผ่าน 114 source files ไม่มี relative imports หายหรือข้อความไทยเป็น ??? |
| iOS build/device/browser E2E | ยังไม่ได้ทดสอบจริง |

## สิ่งที่ต้องตั้งค่าก่อน deploy

- Backend: CORS_ORIGINS เป็น comma-separated web origins; ไม่เปลี่ยน .env จริงระหว่างงานนี้
- Web: VITE_API_ORIGIN เป็น API origin (ไม่เติม /api) หรือใช้ reverse proxy แบบ same-origin
- Android: กำหนด HOMEMATCH_API_ORIGIN ผ่าน Gradle property/environment เป็น HTTPS origin สำหรับ release หรือ HTTP origin สำหรับทดสอบเครื่องจริง
- Android release signing: HOMEMATCH_UPLOAD_STORE_FILE, HOMEMATCH_UPLOAD_STORE_PASSWORD, HOMEMATCH_UPLOAD_KEY_ALIAS, HOMEMATCH_UPLOAD_KEY_PASSWORD ผ่าน environment; ไม่ใช้ debug key เป็น fallback
- iOS: HOMEMATCH_API_ORIGIN เป็น Xcode build setting ผ่าน Info.plist และ SettingsManager; source เตรียมไว้แต่ยังไม่ได้ยืนยันบน macOS/Xcode
- Deploy Backend และ Mobile ที่ปรับ design save contract พร้อมกัน; client เก่าที่แก้ layout เดิมโดยไม่ส่ง expectedUpdatedAt จะได้ 409 แทนการบันทึกทับ
- ไม่สร้าง index, seed หรือ migration ลงฐานข้อมูลจริงระหว่างแก้ ชุดทดสอบใช้ MongoDB ชั่วคราวแยกทั้งหมด

## ข้อจำกัดและงานที่ยังเหลือ

- C-11: pagination/filtering ของ API ทั้งระบบและการปรับทุก consumer ยังเป็นงานต่อ ไม่เปลี่ยน default เป็น limit แล้วทำให้ client เดิมเห็นรายการไม่ครบ
- ห้องจริง/มาตราส่วนแปลน, comparison, Buyer ซื้อบ้าน/ชำระเงิน, Seller Web chat/appointments, Admin price catalog UI และ server-synced Favorites เป็นฟีเจอร์ที่ยังต้องพัฒนาต่อ ไม่ระบุว่าเสร็จจากการแก้บั๊กนี้
- ไม่มีการย้าย Favorites legacy, ล้างข้อมูลซ้ำเดิม หรือแก้ orphan data จริงย้อนหลังโดยอัตโนมัติ
- ระบบตรวจภาพรอบนี้ตรวจ signature/MIME เท่านั้น ยังไม่ใช่ full decode/re-encode หรือ image-bomb protection
- ไฟล์อัปโหลดยังต้องมี storage quota/retention/orphan cleanup ที่กำหนดนโยบายชัดเจน; request rate limit ลด abuse แต่ไม่แทน disk quota
- slip payment ยังเป็น manual review; การยืนยันยอด/transaction ID จากธนาคารและกันใช้ transfer เดียวข้ามหลาย orders ยังไม่เพิ่ม
- การล็อก seller ป้องกัน concurrent mutations ผ่าน API ที่แก้แล้ว ไม่ใช่ DB constraint ต่อ accepted offers/slots สำหรับ external writers; ยังต้อง audit ข้อมูลและออก migration อย่างมีแผนหากมีผู้เขียนข้อมูลภายนอก
- iOS release, bank/email/Google provider จริง, browser/device interactions และ penetration/load tests ยังไม่ได้ทดสอบจริง
- Android ยังมี warnings ของ Gradle/AGP, KSP/Kotlin และ SDK backup ซ้ำ; ไม่อัปเกรด toolchain หรือ dependencies โดยพลการ
- Mobile token ยังเก็บ AsyncStorage; secure-storage migration, ลด production logs และ CDN hardening ยังเป็นงานต่อ

## การรักษางานเดิม

ไฟล์เดิมก่อนแก้สำรองที่ backups/audit-fixes-20261016 โดยรักษา relative paths ของโปรเจกต์ ไม่ reset Git, ไม่ลบงานเดิม, ไม่ commit/deploy และไม่เปิดเผย secrets รายงาน audit เดิมเป็น snapshot ก่อนแก้ ให้ใช้บันทึกนี้อ่านสถานะปัจจุบันประกอบ

## อัปเดต: ราคาเฟอร์นิเจอร์ (16 ตุลาคม 2026)

ตามคำสั่งผู้ใช้ให้กำหนดราคา ได้เพิ่มราคาประมาณการระดับกลางสำหรับเฟอร์นิเจอร์/สุขภัณฑ์ 9 รายการลงฐานข้อมูลจริงด้วย npm run seed:furniture (inserted 9) เฉพาะครั้งนี้เป็นการแก้ข้อมูล catalog ที่ผู้ใช้ร้องขอโดยตรง ไม่แก้ saved designs หรือ price snapshots เดิม

- รายละเอียดราคาและสมมติฐาน: [FURNITURE_PRICES.md](homematch-backend/docs/FURNITURE_PRICES.md)
- อย่างละหนึ่งชิ้นรวม 80,990 บาท ไม่รวมขนส่ง/ติดตั้ง/งานระบบ
- seed เป็น insert-only และ Backend startup เติมเฉพาะรายการที่ขาด ไม่ทับค่า Admin รวมทั้ง 0 และ null
- Mobile customizer แสดงราคาจาก catalog API ที่รายการเลือกเฟอร์นิเจอร์ ส่วนยอดรวมยังคำนวณฝั่ง Backend
- ทดสอบเฉพาะส่วน catalog/price/defaults ผ่าน 12/12; Mobile Jest ผ่าน 4/4; lint ของหน้าที่แก้ไม่มี errors
- พื้น/ผนังยังไม่เติมราคา และแบบที่มี snapshot เก่าเลือก “ดูราคาอ้างอิงปัจจุบัน” เพื่อใช้ราคาใหม่
