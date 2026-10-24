# HomeMatch — Full Project Audit & Code Review

> **สถานะหลังแก้:** รายงานนี้เป็น snapshot ก่อนแก้โค้ด ดู [HOMEMATCH_FIX_LOG.md](HOMEMATCH_FIX_LOG.md) สำหรับรายการแก้ไข ผลทดสอบใหม่ และข้อจำกัดที่ยังเหลือ

วันที่ตรวจ: 16 ตุลาคม 2026 (Asia/Bangkok)  
Workspace: C:\Project 3  
วิธีตรวจ: สำรวจไฟล์, static review ของเส้นทางสำคัญ, ตรวจ relative imports/dependencies, รัน lint/type check/tests/build และตรวจ DB ด้วยคำสั่งอ่านสถานะเท่านั้น

> ผลประเมิน: มีระบบที่พัฒนาและทดสอบได้จริงหลายส่วน โดยเฉพาะสมาชิกและ design workflow แต่ยังไม่ควรรับรองว่าทั้งระบบพร้อม production พบปัญหา session หลัง reset password, concurrency ของข้อเสนอ/นัดหมาย, validation ของแบบ 2D และการจัดการข้อมูลเมื่อประกาศถูกลบ

ไม่ได้แก้ Source Code, migration หรือข้อมูลฐานข้อมูลจริง และไม่ได้ติดตั้ง npm dependencies เพิ่ม การทดสอบ integration สร้างข้อมูลเฉพาะ MongoDB ชั่วคราวที่ชุดทดสอบจัดการเอง การ build สร้าง/ปรับปรุง dist, Android build outputs และ cache ตามปกติ

## A. Project Overview

### A1. โครงสร้างและเทคโนโลยีที่พบจริง

| ส่วน | หลักฐาน | เทคโนโลยี/หน้าที่ |
|---|---|---|
| Backend | homematch-backend/package.json; src/app.js | Node.js, CommonJS, Express 5.2.1, REST API |
| Database | src/config/db.js:5; src/models/*.js | MongoDB ผ่าน Mongoose 9.10.2 |
| Authentication | src/controllers/authController.js:13; middleware/authMiddleware.js | JWT อายุ 1 วัน, bcryptjs cost 12, role จาก User ใน DB, ban และ tokenVersion |
| Web | homematch-web/package.json; vite.config.js; src/index.css | React/React DOM ที่ติดตั้ง 19.3.0, Vite 8.3.1, Tailwind CSS 4.3.3, React Router 7, Axios |
| Mobile | HomeMatchMobile/package.json; App.tsx; src/navigation/AppNavigator.jsx | React 19.2.3, React Native 0.87.1, React Navigation, AsyncStorage 3.1.1 |
| Upload | src/middleware/uploadMiddleware.js; routes/uploadRoutes.js | Multer multipart/form-data, แยก properties/floorplans/profiles; slips อยู่ private |
| Email / Google | authController.js:5-6, 329 เป็นต้นไป | Resend email API และ google-auth-library; Mobile Google Sign-In |
| Map | HomeMatchMobile/src/components/PropertyMap.jsx | Leaflet 1.9.4 ใน WebView และ OpenStreetMap; ไม่ใช่ native map SDK |
| PDF | src/services/designPdfService.js; android/.../HomeMatchPdfModule.kt | HTML renderer และ Android PrintManager ผ่าน native module |
| Tests | backend/tests; Mobile/__tests__ | node:test, MongoMemoryServer/MongoMemoryReplSet, Jest/react-test-renderer |

เวอร์ชันใน package.json เป็นช่วงที่อนุญาต ส่วนเวอร์ชันข้างต้นที่ระบุว่า “ติดตั้ง” มาจาก npm ls จริง เช่น Web manifest ระบุ React ^19.2.8 แต่ที่ติดตั้งคือ 19.3.0 ไม่ถือว่าเป็น dependency ผิดเพียงเพราะเลขต่างกัน

- Backend: controllers 10 ไฟล์, models 13 ไฟล์, routes 11 ไฟล์, middleware 3 ไฟล์, services 4 ไฟล์ และ config DB 1 ไฟล์ รวม source JS 43 ไฟล์ ประมาณ 6,526 บรรทัด
- Web: source JS/JSX 28 ไฟล์ ประมาณ 8,988 บรรทัด แบ่ง pages, Components/Admin, Seller, Subscription และ services
- Mobile: source JS/JSX 36 ไฟล์ ประมาณ 26,082 บรรทัด แบ่ง screens, components, navigation, services และ utils; มี Android/iOS project
- state หลักใช้ useState/useEffect/useCallback และ storage ไม่พบ Redux หรือ shared auth context ในเส้นทางที่ตรวจ
- backups/mongodb-20261014-103450 เป็นข้อมูลสำรอง MongoDB ไม่ใช่ source tree; ตรวจ metadata ประเภทไฟล์ ไม่เปิดเผยเนื้อหา DB
- uploads, private/subscription-slips, dist, logs, assets และ build artifacts มีอยู่จริง ไม่ถือว่าเป็น source implementation เพิ่มเติม
- docs/SUBSCRIPTIONS.md, DESIGN_PRICE_SUMMARY.md, DESIGN_PHASE7_REPORT.md และ Postman collection เป็นเอกสารประกอบ ไม่ใช้แทนผลทดสอบรอบนี้
- ไม่พบ AGENTS.md จากการค้นใน workspace ที่ยกเว้น dependencies และ .git

### A2. ผลตรวจโครงสร้าง / imports / dependencies

npm ls --depth=0 ผ่านทั้งสามโปรเจกต์ ไม่พบ direct dependency ขาด/invalid ในผลลัพธ์ ตรวจ relative import/require แบบข้อความใน source ทั้ง 107 ไฟล์ ไม่พบปลายทางหาย โดยตรวจ extension และ index files ด้วย การตรวจนี้ไม่รับรอง named exports, dynamic imports หรือ case sensitivity บน Linux; Web build และ Android build ให้หลักฐานเพิ่มเติมเฉพาะ build ที่รัน

โครงสร้างแยกสามแอปเข้าใจง่าย แต่ API origin ซ้ำหลายจุด, controller/หน้าจอใหญ่ และไม่มีสัญญา API กลาง ทำให้แก้ไขยาก RoomCustomizerScreen.jsx มีประมาณ 3,824 บรรทัด, AddProperty.jsx ประมาณ 1,355 และ EditProperty.jsx ประมาณ 1,117 ควรแยก state/validation/rendering ออกตามหน้าที่

พบ import ที่ไม่ได้ใช้จาก lint จริง ดู C-08 ไม่สรุปว่า service export หรือ asset อื่น “ไม่ได้ใช้” โดยไม่มี call graph รองรับ ไม่พบหลักฐานว่าหน้าค้นหาใช้ mock property data; มันดึง /properties/public แล้วกรองบนเครื่อง ส่วน simulation payment เป็นโหมดที่ระบุชัด และห้อง 5×6 เมตรเป็นค่าคงที่ที่ยังไม่สัมพันธ์กับแปลนจริง

### A3. API และความสัมพันธ์ข้อมูล

| API prefix | สิทธิ์/การเชื่อมต่อที่ตรวจ |
|---|---|
| /api/auth | register/login seller, buyer register/login/google, me, forgot/reset; มี client ทั้ง Web และ Mobile |
| /api/admin | users, ban/unban, stats; protect + admin |
| /api/properties | public list/detail; seller create/my/stats/update/price/sold/delete; admin all/stats/review |
| /api/uploads | seller upload รูป/แปลน; buyer/seller profile upload |
| /api/appointments | buyer create/my/cancel; seller list/status; มี UI Mobile แต่ขาด Seller Web |
| /api/offers | buyer create/my/cancel; seller list/respond; มี Buyer Mobile และ Seller Web |
| /api/chat | conversations/messages/read/shared design; ตรวจ membership ก่อนเข้าถึง; มี UI Mobile |
| /api/notifications | my/unread/read/read-all; ผูก user ที่ login |
| /api/room-designs | load/save/delete/my-designs, catalog และ price-summary; จำกัด owner ของแบบ, catalog write เป็น admin |
| /api/subscriptions | plans/me/usage/analytics/history/subscribe; seller สำหรับส่วนสมาชิก |
| /api/subscriptions/payments | submit/get/slip; seller ของรายการหรือ admin สำหรับอ่าน |
| /api/admin/subscriptions | payments approve/reject, members, plans, revenue, payment-settings; admin |

เทียบ path สำคัญใน services และ component กับ routes แล้ว ยังไม่พบ endpoint ผิดที่ยืนยันได้จากเส้นทางที่ตรวจ ไม่ใช่การรับรอง API ทุก request แบบ end-to-end ใน UI จริง

Buyer/Seller/Admin ใช้ User collection เดียวและ role enum แยกกัน Property.seller, Appointment.buyer/seller/property, PurchaseOffer.buyer/seller/property, Conversation.buyer/seller/property, Message.conversation/sender, Notification.user และ RoomDesign.userId/propertyId มี Mongoose ref จริง SellerSubscription เก็บ seller unique และ plan snapshot; SubscriptionPayment เชื่อม seller/plan พร้อม snapshot และ review audit fields ส่วน Favorite ไม่มี collection หรือ API ใน Backend

Mongoose ref ไม่ใช่ foreign key constraint: การมี ref ไม่ยืนยันว่าปลายทางยังอยู่ และการลบ Property ยังไม่มีนโยบาย cascade/soft-delete ดู C-05

## B. Feature Checklist

สถานะ Complete ใช้เฉพาะขอบเขตย่อยที่มีการทดสอบครบตามคำอธิบายแถว ไม่ได้หมายถึงฟีเจอร์ทั้งระบบผ่าน E2E; Untested = มีโค้ดแต่ยังไม่ได้ทดสอบจริงในเส้นทางนั้น; Bug รวมข้อผิดพลาดที่ยืนยันจากโค้ด โดยไม่แอบอ้างว่ารัน exploit แล้ว P1 = ควรแก้ก่อน production, P2 = งานสำคัญรอบถัดไป, P3 = ปรับปรุง

| Feature | Status | Evidence | Problem | Priority |
|---|---|---|---|---|
| Seller/Buyer Register | Untested | authController.js:54,187; Web Register; Mobile RegisterScreen | มี validation/hash/create แต่ยังไม่ได้ทดสอบจริงครบ UI/API registration | P2 |
| Password Login | Partial | authController.js:125,258; userModeration.test.js ผ่าน | login/ban มี integration แต่หน้าจอจริงและ session expiry ยังไม่ครบ | P1 |
| Google Buyer Login | Untested | authController.js:554; LoginScreen/RegisterScreen | moderation test mock Google provider; ยังไม่ได้ทดสอบจริงกับ Google | P2 |
| Password reset | Bug | authController.js:479-544 | reset สำเร็จไม่ revoke JWT เดิม (C-01); email จริงยังไม่ได้ทดสอบ | P1 |
| Admin users / ban / unban | Partial | adminController.js:45; UserManagement.jsx; moderation test ผ่าน | Backend tested, UI/accessibility ยังไม่ได้ทดสอบจริง | P2 |
| Admin statistics | Untested | adminController.js:23; AdminDashboard.jsx | count DB จริง แต่ยังไม่ได้ทดสอบจริงผ่านหน้าจอ | P2 |
| Property create / moderation / quotas | Partial | propertyController.js:253 เป็นต้นไป; subscriptions.test.js | quota/concurrent creates/rejection tested; listing UI และ upload lifecycle ยังไม่ครบ | P1 |
| Property edit / price-only | Untested | propertyController.js:329,361; EditProperty.jsx | มี API และ validation; ยังไม่ได้ทดสอบจริงครบ field/room preservation | P2 |
| Property delete | Bug | propertyController.js:377-386 | ไม่มี cleanup/soft-delete ของข้อมูลเกี่ยวข้อง (C-05) | P1 |
| Mark sold | Partial | propertyController.js:505; SellerPropertyTable.jsx | มี seller gate แต่ไม่ประสาน pending offers/appointments | P1 |
| Photo / floor plan separation | Partial | uploadMiddleware.js; Property.js:149,155; AddProperty.jsx:458-626 | path/fields แยกจริง; MIME spoof/owner/lifecycle ยังต้องแก้ | P1 |
| Search / filters / sort | Partial | SearchScreen.jsx:87 เป็นต้นไป; propertyController.js:474 | กรองใน client หลังโหลดทั้งหมด ไม่มี backend pagination/filtering | P2 |
| Property detail / map | Untested | PropertyDetailScreen.jsx:109; PropertyMap.jsx | เชื่อม API/WebView แล้ว; device map และ HTML popup ยังต้องทดสอบ | P2 |
| Floor plan / select room | Untested | FloorPlanViewer.jsx:190 เป็นต้นไป | แสดงแปลนและส่งห้องไป customizer; ยังไม่ได้ทดสอบจริงบนอุปกรณ์ | P2 |
| Add / drag / rotate / delete furniture | Partial | RoomCustomizerScreen.jsx; RoomCustomizerDrag.test.jsx ผ่าน | drag regression ผ่าน 1 case; gesture/rotation UX และขนาดจริงยังไม่ครบ | P2 |
| Floor / wall customization | Partial | RoomCustomizerScreen; roomDesignRoutes.js | บันทึก/โหลดผ่าน integration; 5×6 เมตรคงที่ ไม่ใช่ geometry ของบ้านจริง | P1 |
| Save/load design round-trip (valid payload) | Complete | designWorkflow.test.js subtest 1 ผ่าน | ทดสอบ DB ชั่วคราวว่าตำแหน่ง/ขนาด/rotation/floor/wall คงอยู่; ไม่ครอบคลุม malformed input | P2 |
| Design save validation / concurrency | Bug | roomDesignRoutes.js:176-344 | ไม่มี property/room existence check และ CAS สำหรับ layout (C-06,C-07) | P1 |
| Furniture price / budget / snapshot | Partial | designPrice/Budget tests; designWorkflow subtest 2 ผ่าน | server price, satang arithmetic, owner/CAS tested; material quantities ยังไม่มี | P1 |
| House + decoration total | Missing | designPriceService.js:48-56; designPdf.test.js | แสดงราคาบ้านแยกและ grandTotal เฉพาะของตกแต่ง ไม่มียอดรวมซื้อบ้านครบ | P2 |
| Compare designs and costs | Missing | MyDesignsScreen.jsx; AppNavigator.jsx; routes/roomDesignRoutes.js | มีรายการ/เปิด/ลบ/สรุปราคา ไม่มี comparison workflow | P2 |
| Share immutable design in chat (API) | Complete | designShare.test.js; designWorkflow subtest 3-4 ผ่าน | ทดสอบ owner/property/member และ snapshot; UI จริงยังไม่รับรอง | P2 |
| PDF export | Partial | designPdf tests ผ่าน; Android module build ผ่าน | HTML tested และ native compile; ยังไม่ได้ทดสอบจริงว่าสั่งพิมพ์/บันทึก PDF สำเร็จ | P2 |
| Favorites | Bug | favoriteService.js:3; authService.js:347 เป็นต้นไป | local global key ไม่ผูกบัญชี ไม่ sync DB (C-04) | P1 |
| Chat text / read / polling | Partial | chatController.js; ChatScreen.jsx:268; MessagesScreen.jsx:253 | membership checks และ basic text path tested; ไม่มี pagination; device polling ยังไม่ทดสอบ | P2 |
| Buyer appointment create/cancel | Bug | appointmentController.js:159,636 | slot conflict/past time/CAS ยังมีช่องว่าง (C-03) | P1 |
| Seller appointment Mobile | Untested | SellerAppointmentScreen.jsx:331 | API/หน้าจอมีจริง; ยังไม่ได้ทดสอบจริง UI/concurrency | P1 |
| Seller appointment Web | Missing | Web App.jsx และ SellerSidebar.jsx:28-49 | ไม่มีหน้า/route จัดการนัดหมายสำหรับ Seller Web | P2 |
| Seller chat Web | Missing | Web App.jsx; API มีใน chatRoutes.js | ผู้ซื้อแชทได้ แต่ Seller ต้องใช้ Mobile จึงตอบได้ | P2 |
| Purchase offer create/respond/cancel | Bug | offerController.js:118,408-470 | race รับหลายข้อเสนอของบ้านเดียวกัน (C-02) | P1 |
| Premium quota transaction (API) | Complete | subscriptions.test.js ผ่าน | Free concurrent create, rejected resubmit, expiry/image limits tested บน replica set | P1 |
| Premium checkout / renewal UI | Partial | SubscriptionPlans/Checkout/MySubscription | API subscribe/approve tested; UI จริงยังไม่ได้ทดสอบ | P2 |
| Subscription payment idempotency (API) | Complete | subscriptions.test.js | server price, order key, approval once, slip privacy และ revenue mode ผ่าน | P1 |
| Bank amount / duplicate transfer verification | Partial | subscriptionPaymentController.js:98 เป็นต้นไป | admin ตรวจด้วยตา ไม่มี bank transaction identity/reconciliation | P1 |
| Buyer house payment / transaction status | Missing | Backend models/routes; Mobile navigation/services | ที่มีเป็น seller subscription payments ไม่มี home-purchase payment flow | P1 |
| Notifications | Partial | notificationController.js; chat workflow test | DB notification tested สำหรับ chat; appointment consistency/push ยังไม่ครบ | P2 |
| Loading / empty / error UI | Partial | SearchScreen, dashboards, SubscriptionUI, MyDesigns | มี state หลายหน้า แต่ auth errors/stale data ยังไม่รวมศูนย์ | P2 |
| Web / Android build | Complete | ผลคำสั่งใน F1 | build ผ่านเฉพาะ configuration ที่รัน ไม่รับรอง runtime/release | P2 |
| Mobile iOS | Untested | ios/Podfile, Info.plist | ยังไม่ได้ทดสอบจริง; host Windows ไม่มี Xcode | P2 |

## C. Bugs & Errors

### C-01 — JWT เดิมยังใช้ได้หลัง reset password [P1 / High]

หลักฐาน: homematch-backend/src/controllers/authController.js:505-530 เปลี่ยน password และ unset reset token แต่ไม่เพิ่ม tokenVersion ขณะที่ middleware/authMiddleware.js ตรวจ version และ generateToken แนบ version อยู่แล้ว

ผลกระทบ: ผู้ที่ถือ JWT ก่อนผู้ใช้ reset password ยังเข้าบัญชีได้จน token หมดอายุ แม้เปลี่ยนรหัสผ่านเพื่อกู้บัญชีแล้ว แนวทางแก้: เพิ่ม tokenVersion ภายใน atomic update เดียวกับ reset และเพิ่ม regression ว่า JWT ก่อน reset ได้ 401 ส่วน login ใหม่ใช้ได้ สถานะ: ยืนยันจาก code path ยังไม่ได้รันสถานการณ์ reset จริง

### C-02 — ยอมรับข้อเสนอหลายรายการของบ้านเดียวกันได้เมื่อทำพร้อมกัน [P1 / High]

หลักฐาน: controllers/offerController.js:408-470 อ่าน pending offer/property แล้วตรวจ PurchaseOffer.exists accepted แยกจาก update; models/PurchaseOffer.js:45-50 unique เฉพาะ pending ของ property+buyer ไม่มี unique accepted ต่อ property

คำขอรับข้อเสนอ A และ B สามารถอ่านว่าไม่มี accepted พร้อมกัน แล้ว update คนละ document สำเร็จทั้งคู่ได้ การ cancel ของ offer เดียวมี CAS status pending แล้ว แต่ไม่แก้ race ระหว่างสอง offers แนวทางแก้: serialize/transaction ผ่าน property เดียว, เพิ่ม partial unique accepted ต่อ property ตามกฎธุรกิจ และกำหนดว่าจะ reject ข้อเสนออื่น/จอง/ขายเมื่อใด จัดการ duplicate-key เป็น 409 ไม่ใช่ 500 ทดสอบสอง buyers accept พร้อมกัน สถานะ: code-confirmed race ยังไม่ได้ stress test

อีกจุด: offerController.js:64-67 อนุญาต offerPrice > 0 แต่ PurchaseOffer.js:24 กำหนด min 1 ทำให้ค่าระหว่าง 0 กับ 1 ผ่าน controller แล้วตก model เป็น 500 ควรใช้ validator สอดคล้องและคืน 400

### C-03 — การนัดหมายยังกัน slot ซ้ำและการเปลี่ยนสถานะพร้อมกันไม่ครบ [P1]

หลักฐาน: appointmentController.js:105-120 ตรวจเฉพาะวัน, :159-178 duplicate query รวม buyer, :192 create แยกจาก query; Appointment.js ไม่มี slot unique index; :425-495 และ :636-674 ใช้ read/check/save

- สอง buyers นัดบ้านเดียวกันวันเวลาเดียวกันได้; ผู้ขายคนเดียวกันนัดคนละบ้านเวลาเดียวกันก็ไม่ถูกตรวจ
- วันนี้แต่เวลาที่ผ่านแล้วไม่ถูกปฏิเสธ เพราะไม่ได้รวม date+time เป็น instant
- query แล้ว create แยกกัน ยังซ้ำ buyer เดียวกันได้เมื่อส่งพร้อมกัน
- seller confirm กับ buyer cancel อาจอ่าน pending ก่อน แล้ว save ทับกัน; notification อาจไม่ตรงสถานะสุดท้าย

แนวทางแก้: นิยาม slot/duration/timezone Asia/Bangkok, ตรวจเวลารวม, ใช้ conditional update และ index/transaction ที่สะท้อนกฎ slot จริง เพิ่ม concurrent create/confirm/cancel tests สถานะ: static evidence ยังไม่ได้ทดสอบจริงทั้ง flow

### C-04 — Favorites ข้ามบัญชีและข้อมูลไม่ sync [P1 / Medium]

หลักฐาน: HomeMatchMobile/src/services/favoriteService.js:3 ใช้ @homematch_favorites เพียง key เดียว ทุก function อ่าน/เขียนรายการ Property ใน AsyncStorage; authService.js logout ลบเฉพาะ token/user ไม่มี favorite namespace

ผล: ผู้ใช้ B บนอุปกรณ์เดียวกันเห็นรายการของ A, เปลี่ยนเครื่องแล้วไม่มี favorites และ snapshot อาจยังแสดงบ้านที่ลบ/ขายแล้ว อีกทั้ง read-modify-write พร้อมกันทำให้รายการหายได้ แนวทางแก้: user-scoped API/collection พร้อม unique user+property; หากคง local ให้แยก userId, reconcile กับ API และ serialize writes

### C-05 — ลบประกาศทิ้ง dangling references และผู้ใช้ลบแบบบางรายการไม่ได้ [P1]

หลักฐาน: propertyController.js:377-386 ลบเฉพาะ Property; appointment/offer/chat/design ยังอ้าง id เดิม; roomDesignRoutes.js:115-125 populate propertyId; MyDesignsScreen.jsx:85-100 และ :147-159 ต้องได้ propertyId ก่อนลบแบบ

เมื่อ populate ไม่พบ Property จะได้ null ทำให้ MyDesigns ลบแบบนั้นผ่าน UI ไม่ได้ ถึงแม้ RoomDesign ยังอยู่จริง แนวทางแก้: soft-delete/tombstone property, เก็บ identity สำหรับงานประวัติ และใช้ designId endpoint สำหรับลบโดย owner กำหนดนโยบาย appointments/offers/media ชัดเจน ห้าม cascade ลบหลักฐานธุรกรรมโดยไม่มีนโยบาย

### C-06 — Save แบบ 2D ยอมรับ payload ที่สรุปราคาไม่ได้ [P1]

หลักฐาน: roomDesignRoutes.js:218-250 cast/coerce furniture แล้ว upsert ที่ :258-344; RoomDesign.js ไม่มี min/finite/unique instance id validators สำหรับ layout; designPriceService.js:9-13 ปฏิเสธ duplicate ids และค่าติดลบ

ผล: x=-1, width=-10 หรือ id ซ้ำสามารถผ่าน save schema แต่ price-summary คืน 400; null furniture item ทำให้เกิด exception และ 500; numeric strings/ข้อมูลหายถูกเปลี่ยนเป็น 0 จนซ่อนข้อผิดพลาด แนวทางแก้: shared strict layout validator ก่อน save, ตรวจ finite/range/size/rotation/array limits และ unique ids ให้ตรงกับ price validator คืน 400 โดยไม่ persist invalid payload

### C-07 — Save layout ไม่ตรวจบ้าน/ห้องจริงและไม่มี optimistic concurrency [P1]

หลักฐาน: roomDesignRoutes.js:176-344 ตรวจ propertyId เพียงรูปแบบ ObjectId ไม่ query Property/floor/room; filter upsert มี userId/propertyId/floor/roomId แต่ไม่มี expectedUpdatedAt ขณะที่ price-summary PATCH :24-47 มี CAS แล้ว

ผล: สร้างแบบกับบ้าน/ห้องที่ไม่มีจริงได้, เกิด orphan designs และ editor สองเครื่องทับ layout กันเงียบ ๆ Ownership ของ “แบบ” ยังถูกจำกัดด้วย userId จึงไม่ใช่หลักฐาน IDOR อ่านแบบคนอื่น แนวทางแก้: ตรวจ property eligibility และ room membership, เก็บ version ของ floor plan, เพิ่ม expectedUpdatedAt/version CAS ของ layout และจัดการ create race ด้วย unique index

### C-08 — Quality checks ไม่ผ่าน [P1/P2]

Web lint: PurchaseOffers.jsx:201 react-hooks/set-state-in-effect; SellerDashboard.jsx:7 ArrowLeft unused; pages/ForgotPassword.jsx:2 และ ResetPassword.jsx:2 React unused รวม 4 errors

Mobile lint: CreateAppointmentScreen.jsx:119 missing dependency handleBack; อีก 36 warnings ส่วนใหญ่ inline styles/unstable nested components/unused import

Mobile type check: App.tsx:12 ใช้ StatusBar backgroundColor ที่ type ของ React Native เวอร์ชันนี้ไม่รับ (TS2769) tsconfig.json include เฉพาะ ts/tsx ดังนั้น JSX screens ส่วนมากไม่ได้รับ type check

Mobile Jest: __tests__/App.test.tsx ล้มระหว่างโหลด @react-navigation/native/lib/module/index.js เนื่องจาก Unexpected token export; jest.config.js มี transformer แต่ยังไม่มี configuration/mock ที่รองรับ dependency chain นี้ ส่วน RoomCustomizerDrag.test.jsx ผ่าน

แนวทางแก้: แก้ state/effect และ dependency ตามพฤติกรรมจริง, ลบ import ไม่ใช้, ปรับ StatusBar ตาม installed types และ Jest transforms/mocks ห้ามลดกฎเพียงเพื่อให้เขียว

### C-09 — Session หมดอายุระหว่างเปิดหน้าไม่ถูกจัดการรวมศูนย์ [P2]

หลักฐาน: Web services/Api.js และ Mobile services/api.js มี request interceptor เท่านั้น; ProtectedRoute.jsx:18-34 ตรวจเมื่อ mount; Mobile MainTabs อ่าน role จาก getStoredUser

ผล: token หมดอายุ/โดน revoke แล้วบางหน้ายังแสดง user/data เดิม พร้อม error ซ้ำจาก polling โดยไม่มี auth reset ที่สม่ำเสมอ ProtectedRoute ยังล้าง session เมื่อ network error ทุกชนิด ทำให้เครือข่ายขัดข้องถูกมองว่า logout แนวทางแก้: auth state กลาง, response handling แยก 401/403 ban/5xx/network, cancel polling และ clear sensitive cache ตาม account

### C-10 — Room customizer ใช้ขนาดห้องคงที่ [P1/P2]

หลักฐาน: RoomCustomizerScreen.jsx:34-35 ROOM_WIDTH_METERS=5 และ ROOM_HEIGHT_METERS=6; :1618-1626 save ค่านี้ทุกห้อง; Property.js room schema มีชื่อ/ตำแหน่ง/รูป แต่ไม่มีขนาด/geometry ของห้องจริง

ผล: การเลือกห้องจากแปลนไม่ได้ให้มาตราส่วนจริงสำหรับวาง furniture จึงยังไม่ใช่การตกแต่งตามผังห้องจริงอย่างแม่นยำ designPriceService.js ตั้ง material quantity เป็น null อย่างถูกต้องแทนการคูณพื้นที่สมมติ แนวทางแก้: calibration/room dimensions/polygon และ versioned geometry ก่อนคิดราคาพื้น/ผนัง

### C-11 — Pagination/filtering และสถิติยังโหลดข้อมูลทั้งหมด [P2]

หลักฐาน: propertyController.js:274,295,395,422,474; adminController.js:7; appointmentController.js:290,336; offerController.js:208,324; chatController.js getMessages; roomDesignRoutes.js my-designs

ผล: ข้อมูลเพิ่มแล้ว response/memory/เวลา query เพิ่ม, Mobile search ใช้ bandwidth โหลดทุกบ้าน และ chat polling อ่านประวัติทั้งหมดซ้ำ แนวทางแก้: server filtering, bounded page/cursor, aggregation stats, projection และ compound indexes ตาม query วัด explain ก่อนเพิ่ม index โดยไม่จำเป็น

### C-12 — API origin/CORS ผูกกับเครื่องพัฒนา [P1 ก่อน deploy]

หลักฐาน: Web services/Api.js:4, pages/ForgotPassword.jsx:34 และ ResetPassword.jsx:41; Mobile services/api.js:5, offerService.js:6, LoginScreen.jsx:30; Backend app.js origin localhost:5173

ผล: เว็บที่ deploy จะเรียก localhost ของผู้ใช้, Mobile 10.0.2.2 ใช้สำหรับ Android emulator ไม่ใช่มือถือจริง/iOS และ origin production ไม่ผ่าน CORS แนวทางแก้: environment-specific HTTPS base URL กลาง, allowlist ของ frontend ที่ deploy จริง CORS นี้เป็น allowlist ที่แคบ ไม่ใช่ wildcard credential leak

### C-13 — Notification failure ทำให้ API รายงานล้มเหลวหลังบันทึกนัดสำเร็จ [P2]

หลักฐาน: appointmentController.js:192-236 create นัดก่อน Notification.create, :495-565 save status ก่อนสร้าง notification, :674-714 cancel ก่อน notification ภายใน try เดียว

หาก notification validation/DB error เกิดหลังบันทึก นัด/สถานะเปลี่ยนแล้วแต่ client ได้ 500 และอาจ retry จนเกิดผลซ้ำ แนวทางแก้: transaction+outbox หรือแยก notification ให้ไม่ทำให้ผลหลักย้อนแย้ง พร้อม idempotency ตาม action ส่วน chat มี try/catch แยก notification แล้ว แต่ message create กับ conversation update ยังไม่ atomic

### C-14 — ตัวเลือก Remember me ของ Mobile ยังไม่มีผล [P3]

หลักฐาน: LoginScreen.jsx:37 และ :401-403 เปลี่ยน UI state เท่านั้น; handleLogin ไม่ส่ง rememberMe ไป authService ซึ่งบันทึก token/user แบบเดียวเสมอ แนวทางแก้: นิยามว่า “จำอีเมล” หรือ “คง session” แล้วทำให้ behavior และข้อความตรงกัน

### C-15 — Subscription resource แสดงข้อมูล endpoint ก่อนหน้าเมื่อเปลี่ยน page/filter [P2]

หลักฐาน: Web services/useSubscriptionResource.js:6-20 เมื่อ endpoint เปลี่ยนไม่ reset loading/data; catch คง previous.data ไว้

ผล: เปลี่ยนตัวกรอง/หน้าแล้วระหว่างโหลด หรือเมื่อ request ใหม่ล้มเหลว ยังเห็นรายการเก่าในบริบทใหม่ โดยเฉพาะหน้า admin review ควรป้องกัน action กับ stale context แนวทางแก้: cache แยกตาม endpoint, แสดง loading/stale indicator และ disable actions จนข้อมูลตรง request ปัจจุบัน


## D. Security Issues

ไม่พบหลักฐานเพียงพอให้จัด Critical ในรอบนี้ ไม่ได้หมายความว่าไม่มี Critical หรือรับรองผ่าน penetration test

| ID | Severity | หลักฐาน / ความเสี่ยง | ข้อเสนอ |
|---|---|---|---|
| SEC-01 | High | authController.js:505-530: reset ไม่ revoke JWT (C-01) | เพิ่ม tokenVersion ใน atomic update |
| SEC-02 | High | app.js และ routes/authRoutes.js: ไม่พบ app-level rate limiter สำหรับ login/reset/register; bcrypt cost 12 และ Resend ถูกเรียกตาม request | จำกัดต่อ IP+account, backoff และ email cooldown; edge rate limit ยังไม่ได้ตรวจ |
| SEC-03 | High | offerController.js:441-470: race ยอมรับหลายข้อเสนอ (C-02) | transaction/property lock + DB invariant |
| SEC-04 | Medium | middleware/uploadMiddleware.js fileFilter เชื่อ file.mimetype; ต่างจาก slip ที่ตรวจ signature | ตรวจ signature/decode/re-encode, pixel/dimension limits และ nosniff; ยังไม่ได้ทดสอบไฟล์ปลอมจริง |
| SEC-05 | Medium | uploadRoutes.js โหลด entitlement และจำกัดต่อ request แต่ upload ซ้ำได้ไม่จำกัด storage; orphan upload ไม่ถูกล้างเมื่อยกเลิก/ลบประกาศ | owner metadata, storage quota/rate limit, temporary upload TTL และ cleanup job |
| SEC-06 | Medium | propertyController.js:36-40, validateMedia: ตรวจ URL ด้วย regex เท่านั้น ไม่มี upload record/owner/file existence | ผูก uploadId กับ seller และตรวจ ownership ก่อนอ้างอิง; media บางส่วน public อยู่แล้ว จึงไม่อ้างว่าเป็น private-file IDOR |
| SEC-07 | Medium | Mobile favoriteService.js global key; logout ไม่ล้าง account cache | user namespace/API favorites และแยก cache |
| SEC-08 | Medium | Mobile api.js และ Web Api.js ใช้ HTTP; authService.js เก็บ token ใน AsyncStorage | ใช้ HTTPS ใน deployment และ secure token storage ตาม threat model; localhost HTTP เป็น dev config |
| SEC-09 | Medium | subscriptionPaymentController.js:58-77,:98-118 ไม่มี transfer ref/hash/verified amount จากธนาคาร | reconcile bank transaction, บังคับ transaction identity unique และบันทึก verified amount/audit; idempotency ป้องกัน order/approval ซ้ำแล้ว แต่ไม่ป้องกัน slip เดิมใช้หลาย order |
| SEC-10 | Medium | PropertyMap.jsx:27-30,:96 safeTitle เป็น JS-string escaping แล้วส่ง bindPopup; title ไม่ได้ HTML sanitize | ใช้ DOM node และ textContent สำหรับ popup; มีความเสี่ยง HTML injection ที่ sink ต้องยืนยัน behavior กับ Leaflet/runtime ก่อนสรุป stored XSS; ไม่ได้ทดสอบ exploit |
| SEC-11 | Medium | android/app/build.gradle release ใช้ signingConfigs.debug | ใช้ release signing แยกและเก็บ credential นอก source; ไม่แสดงค่า keystore/password ในรายงาน |
| SEC-12 | Low | app.js error handlers ส่ง err.message และคืน 400 แม้ error ภายในบางชนิด | map 4xx/5xx และ generic production message พร้อม correlation id |
| SEC-13 | Low | roomDesignRoutes.js:346-380, Mobile navigator/Login/Notification logs, EditProperty request logs | ลด production logging ของ user identifiers, messages และ full payload |
| SEC-14 | Low | PropertyMap.jsx: CDN script/style และ originWhitelist=['*'] | bundle/verify external assets และจำกัด navigation origins ตามความจำเป็น |

สิ่งที่มีการป้องกันอยู่จริง:
- password hash cost 12, password/reset token fields select:false, reset token เก็บ SHA-256 และหมดอายุ 15 นาที; consume token แบบ atomic update
- JWT verify ด้วย secret, โหลด user จาก DB และตรวจ ban/tokenVersion ทุก protected request; ไม่เชื่อ role ใน client เป็น authority
- registration กำหนด role ฝั่ง server และ property editable fields ไม่อนุญาต seller/status injection
- chat ตรวจ conversation membership; shared design จำกัด owner/property และเก็บ immutable copy; tests ผ่าน
- subscription slip ไม่เสิร์ฟผ่าน static uploads, ตรวจ magic bytes และ ownership, no-store/nosniff
- subscription amount/plan มาจาก server snapshot; approve และ membership อยู่ transaction เดียว; concurrent tests ผ่าน

NoSQL injection: auth ตรวจ string และ property fields ถูก allowlist; ยังไม่พบ exploit ที่ยืนยันได้จากเส้นทางที่ตรวจ แต่ไม่รับรองว่า input ทุก endpoint ปลอดภัย เช่น appointment/body และ design coercion ยังไม่สม่ำเสมอ  
XSS: React rendering ปกติช่วย escape text; PDF generator มี escaping tests ผ่าน ส่วน Map popup แยกเป็นข้อสงสัย SEC-10 ไม่เหมารวมว่าทุกช่องทางปลอดภัย  
Secrets: ตรวจเพียงการมี config/ชื่อ env และโค้ดอ้างอิง ไม่แสดงค่า .env, JWT secret, passwords, API keys, OAuth client ID หรือข้อมูลรับเงิน ไม่ได้ audit Git history/ความแข็งแรงของ secret หรือสิทธิ์ OS ของ backup  
.env ถูก ignore ใน Backend, private/ และ *.log ถูก ignore; backups ถูก ignore ที่ root การ ignore ไม่ยืนยันว่าไฟล์ไม่เคยถูก commit หรือถูกป้องกันตอน deploy

## E. Missing Features

1. Buyer home-purchase payment: order/accepted-offer linkage, payment intent/deposit, provider verification, transaction status, refund/cancel และ reconciliation ไม่มีใน models/routes/services/navigation ที่สำรวจ SubscriptionPayment เป็นคนละ domain
2. Design comparison: ยังไม่มีเลือกหลายแบบ/เปรียบเทียบรายการ/ราคา/ส่วนต่าง แม้มี MyDesigns และ price summary
3. ราคาบ้านรวมตกแต่งครบ: grandTotal ปัจจุบันเป็นเฉพาะรายการตกแต่งที่คำนวณได้; material quantities, labor/delivery/other costs และยอดรวมบ้านต้องกำหนดขอบเขตต่อ
4. Room geometry/scale จริงและ mapping กับ furniture dimensions; editor ใช้ห้องสี่เหลี่ยมคงที่
5. Seller Web appointment management และ Web chat; Backend/Mobile มีบางส่วนแล้ว
6. Favorites ฝั่ง server/user-linked database; local favorite ไม่เติมเต็มความต้องการ DB
7. Admin catalog-price management UI: มี PUT /room-designs/catalog/:category/:key สำหรับ admin แต่ไม่พบ Web screen เรียก endpoint นี้ ต้องตั้งราคาผ่าน API ปัจจุบัน
8. Push notifications/device registration ไม่พบ implementation; ที่มีเป็น DB notification/polling ไม่สรุปว่าขาด requirement หากต้องการเพียง in-app
9. ยังไม่พบ CI pipeline/container/deployment configuration ในไฟล์ที่สำรวจ; ยังไม่มี automatic gate สำหรับ lint/type/test ทั้งสามโปรเจกต์
10. Lifecycle ที่เชื่อม accepted offer → reserve/sold/payment และยุตินัด/ข้อเสนอที่เหลือยังไม่ครบ การเพิ่มส่วนนี้ต้องกำหนดกฎธุรกิจก่อน

## F. Recommended Improvements

### F1. ผลทดสอบจริงรอบนี้

| คำสั่ง / วิธี | ผลจริง | ขอบเขต/ข้อจำกัด |
|---|---|---|
| npm ls --depth=0 ทั้ง 3 projects | PASS, exit 0 | direct installed deps; ไม่ใช่ vulnerability audit |
| Web npm run lint | FAIL, exit 1 | 4 errors, 0 warnings (C-08) |
| Mobile npm run lint | FAIL, exit 1 | 1 error, 36 warnings |
| Mobile tsc --noEmit --incremental false | FAIL, exit 1 | TS2769 StatusBar; include เฉพาะ TS/TSX |
| Backend node --test tests/designCatalog.test.js tests/designPrice.test.js tests/designBudget.test.js tests/designPdf.test.js tests/designShare.test.js | PASS 18/18, exit 0 | unit/schema tests และ HTTP tests ที่ mock DB; ไม่ใช่ MongoDB integration |
| Backend node --test tests/subscriptions.test.js tests/designWorkflow.test.js tests/userModeration.test.js | PASS 17/17 รวม subtests, exit 0 | real isolated MongoDB/replica set และ HTTP/JWT; Google provider mock; รวม copy check หนึ่งรายการ |
| Mobile npm test -- --runInBand --watch=false | FAIL, exit 1 | 1 suite ผ่าน, 1 suite โหลดไม่สำเร็จ; 1 executed test ผ่าน ไม่ใช่ App test ผ่าน |
| Web npm run build | PASS, exit 0 | Vite built 1,973 modules, JS 499.29 kB / gzip 139.77 kB, CSS 38.70 kB |
| Android gradlew.bat :app:assembleDebug --offline --no-daemon | PASS, exit 0 | BUILD SUCCESSFUL in 27s, 223 tasks; ไม่ใช่ release build/Metro runtime/device test |
| DB driver connect + ping + hello | PASS | ping=1, replicaSet=true, mongos=false; ไม่มี collection writes/index init/seeding |
| Relative import existence scan | PASS | 107 source files, missing relative paths 0; ไม่ใช่ full semantic export analysis |

Backend รวม 35 reported tests ผ่านทั้งหมดจากสองคำสั่ง ไม่ได้หมายถึง coverage ทุกฟีเจอร์ และไม่ใช้จำนวน test แทนความครบของระบบ ชุดทดสอบไม่ได้ผ่าน app.js startup จริงทุก middleware: หลาย test สร้าง Express harness และ mount routes เอง

Android build มี warnings เรื่อง deprecated Gradle/AGP APIs, KSP 2.2.0-2.0.2 เก่ากว่า Kotlin 2.2.10 และ SDK platform-tools.backup ซ้ำ แม้ build ผ่าน ควรแก้ toolchain ให้เข้าคู่ก่อนอัปเกรด ไม่ได้ติดตั้ง/อัปเกรด dependencies ระหว่าง audit

ยังไม่ได้ทดสอบจริง: iOS build (Windows ไม่มี Xcode), Android release build/install/launch, browser/device responsive flow, screen reader/keyboard/contrast, Google และ Resend จริง, การโอนเงิน/ยอดเข้าธนาคาร, malicious upload/penetration/load tests, reset-password session regression, appointment/offer concurrency และ production infrastructure  
Backend ไม่มี lint/typecheck script และ Web ไม่มี test/typecheck script ใน package.json จึงไม่รายงานว่าผ่าน ไม่ได้รัน npm audit/ค้น CVE รอบนี้ และไม่สรุปว่า dependencies ปราศจากช่องโหว่

### F2. Performance / Database

- เพิ่ม pagination/cursors ให้ public properties, offers, appointments, conversations/messages, designs และ users; filter/sort ฝั่ง server และ stable sort keys
- ใช้ aggregation สำหรับ stats และ select เฉพาะ fields แทนโหลด documents ทั้งหมดมานับใน JS
- ปัจจุบันมี unique email/googleId, conversation triplet, room design owner/property/floor/room, pending offer property+buyer, subscription seller, payment seller+idempotencyKey และ catalog category+key
- ยังขาด index สำหรับ appointment slots, accepted-offer invariant และ public status+createdAt ตาม query pattern; ควรตรวจ explain และข้อมูลซ้ำก่อนออก migration
- dailyViews เป็น Map ที่เพิ่มวันไปเรื่อย ๆ; subscription history เป็น embedded array ที่โตไม่จำกัด ควรกำหนด retention/collection แยกก่อนข้อมูลมาก
- แยก server app factory ออกจาก connect/seed/listen; app.js ปัจจุบัน startServer() อัตโนมัติและ seedPlans() ก่อน listen จึงไม่ควรใช้มันตรวจ DB แบบ read-only
- MongoDB ที่ตรวจเชื่อมต่อได้และมี replica set; ยังไม่ได้ตรวจขนาดข้อมูล, actual indexes, duplicates, backup restore หรือ referential integrity ของข้อมูลจริง

### F3. Maintainability / UX

- สร้าง API client/config กลางทั้ง Web/Mobile ลด raw Axios และ origins ที่ซ้ำ ใช้ schema contract สำหรับ API responses
- แยก customizer engine/gesture/catalog/rendering/persistence และ form validation ออกจากหน้าจอขนาดใหญ่
- แยก editor save schema กับ price calculation ให้ใช้ validation เดียวกัน และแยก generic room mock dimensions ออกจาก geometry ที่วัดจริง
- เพิ่ม UI regression ครอบคลุม token expiry, account switch, deleted property, empty state, slow API, retry และ stale filter
- ฟอร์ม AddProperty.jsx:741-748 และ EditProperty.jsx:716 เป็นต้นไปมี label แยก input แต่ไม่มี htmlFor/id ที่สัมพันธ์ในตัวอย่างที่ตรวจ; ปรับ programmatic labels และ error descriptions
- Admin UserManagement.jsx:42 มี role=dialog/aria-modal แล้ว แต่ไม่พบ focus trap/Escape/focus restoration; ควรเพิ่มและทดสอบ keyboard จริง
- Web มี responsive classes, mobile sidebar และ overflow-x-auto ในตาราง; Mobile ใช้ SafeAreaView, FlatList/ScrollView และ FloorPlanViewer ใช้ window dimensions จึงมีพื้นฐาน responsive แต่ยังไม่ได้ยืนยัน overflow/large text บนอุปกรณ์
- Map เป็นเครือข่ายภายนอก; ควรมี loading/error/retry ที่ตรวจ tile/CDN failures ได้จริง และจำกัด navigation
- แสดงยอดประมาณการไม่ครบแยกจากราคารวมที่ยืนยัน ห้ามทำให้ผู้ซื้อเข้าใจว่าราคาพื้น/ผนังที่ไม่ทราบรวมเป็นศูนย์

## G. Development Roadmap

1. **Critical Bugs / ก่อนเปิดใช้งานจริง** — ปิด C-01 JWT reset, C-02 accepted-offer race, C-03 slot/state races และเข้มงวด C-06 design validation; ยังไม่มี finding ระดับ Critical ที่ยืนยันได้ แต่ P1 เหล่านี้เป็น release gates
2. **Backend/API Issues** — CAS ของ layout, property/room validation, auth rate limits, error/status mapping, upload verification/ownership/quota และ notification outbox; จัดทำ API schemas
3. **Database Issues** — กำหนด soft-delete/history policy, แก้ dangling references อย่างมีแผน, unique accepted offer/slot constraints และ query indexes; ตรวจข้อมูลก่อน migration โดยขอคำสั่งแยกจาก audit
4. **Missing Core Features** — นิยามบ้านรวมตกแต่ง/geometry และ comparison, Buyer purchase payment และ accepted-offer lifecycle, server favorites
5. **Frontend/Mobile Integration** — Seller Web appointments/chat, Admin catalog UI, environment URLs, auth context/session expiry และ cache separation
6. **UI/UX Improvements** — labels/focus/dialog keyboard, retry/empty/stale states, device gestures/large fonts/responsive และ remember-me behavior
7. **Testing & Deployment** — แก้ lint/type/Jest ให้ผ่าน, integration offer/appointment/reset/delete regressions, browser/device E2E, Android release signing/build, iOS build บน macOS, CI และ deployment/monitoring/backup restore

เกณฑ์ปิดงาน: สองคำขอพร้อมกันไม่ทำลาย business invariant, JWT ก่อน reset ถูกปฏิเสธ, invalid design ไม่ถูกบันทึก, สลับบัญชีไม่เห็นข้อมูลอีกบัญชี, ลบ/ปิดประกาศแล้วยังจัดการประวัติได้ และ automated gates ผ่านก่อน deploy

## H. Project Completion Summary

ไม่สามารถประเมินเปอร์เซ็นต์ “เสร็จพร้อมใช้งาน” ของ Admin, Seller, Buyer, Backend และ Database ได้อย่างน่าเชื่อถือในรอบนี้ เพราะไม่มี acceptance criteria/น้ำหนักฟีเจอร์ที่ตกลงร่วมกัน และไม่มี E2E validation ของหน้าจอ/ข้อมูลจริงครบทุก workflow การให้ตัวเลขจากจำนวนไฟล์หรือจำนวน test จะทำให้เข้าใจผิด

| ส่วน | เปอร์เซ็นต์ | หลักฐานที่ยืนยันได้ | ส่วนที่ยังขวางความครบ |
|---|---|---|---|
| Admin Web | ไม่สามารถประเมินได้ | users/moderation, stats, property review, subscriptions มีโค้ด; moderation และ membership API tests ผ่าน | browser E2E, catalog UI, accessibility, quality gates |
| Seller Web | ไม่สามารถประเมินได้ | listing CRUD/forms, offers, dashboard, plans/checkout/history มีโค้ด; quota/payment API tests ผ่าน | appointments/chat Web, accepted-offer race, actual UI/payment review |
| Buyer Mobile | ไม่สามารถประเมินได้ | property/search/map/2D/chat/appointment/offer/design summary มีโค้ด; design integration + drag test + debug build ผ่าน | house payment/compare, server favorites, real geometry, lint/type/Jest/device E2E |
| Backend | ไม่สามารถประเมินได้ | 11 route modules, 35 tests ผ่าน; RBAC และ transaction quota/payment มีหลักฐาน | reset revocation, offer/appointment races, invalid design, pagination, purchase-payment domain |
| Database | ไม่สามารถประเมินได้ | 13 models/ref/index definitions; live ping/replica-set ผ่าน และ isolated integration ผ่าน | actual data/index audit, referential lifecycle, accepted/slot invariants, restore verification |

หากจะคำนวณเปอร์เซ็นต์รอบถัดไป ให้กำหนด acceptance items ต่อ subsystem และน้ำหนักก่อน แล้วใช้สูตร:
**ความครบที่ทดสอบยืนยัน = ผลรวมน้ำหนักรายการที่ผ่าน acceptance test / ผลรวมน้ำหนักรายการในขอบเขต × 100**
รายงาน Partial/Bug/Missing/Untested แยกต่างหาก ไม่แปลง “มีโค้ด” เป็น “ทำงานครบ” โดยอัตโนมัติ

### ข้อจำกัดของ audit

สำรวจ source tree และ API inventory ทั้งสามส่วนแล้ว โดย review เชิงลึกเน้น auth, authorization, property/media, subscriptions/payments, designs/pricing/sharing, offer และ appointment lifecycle ไม่ใช่การพิสูจน์ทุกบรรทัดหรือ formal verification dependencies/generated builds/binary assets/backup contents ไม่ถูกตรวจเทียบเท่า application source และบาง UI ตรวจจากโค้ดโดยยังไม่ได้เปิดจริง Findings ที่เป็น static inference ระบุไว้แล้ว ไม่มีผล exploit/coverage/performance ที่สร้างขึ้นเอง

## Appendix — Source Inventory

รายการด้านล่างรวบรวมจาก source tree จริงเพื่ออ้างอิงขอบเขต ไม่ได้หมายความว่าแต่ละไฟล์ผ่านการทดสอบทุกฟังก์ชัน

### homematch-backend\src
- [homematch-backend/src/app.js](homematch-backend/src/app.js)
- [homematch-backend/src/config/db.js](homematch-backend/src/config/db.js)
- [homematch-backend/src/controllers/adminController.js](homematch-backend/src/controllers/adminController.js)
- [homematch-backend/src/controllers/appointmentController.js](homematch-backend/src/controllers/appointmentController.js)
- [homematch-backend/src/controllers/authController.js](homematch-backend/src/controllers/authController.js)
- [homematch-backend/src/controllers/chatController.js](homematch-backend/src/controllers/chatController.js)
- [homematch-backend/src/controllers/notificationController.js](homematch-backend/src/controllers/notificationController.js)
- [homematch-backend/src/controllers/offerController.js](homematch-backend/src/controllers/offerController.js)
- [homematch-backend/src/controllers/propertyController.js](homematch-backend/src/controllers/propertyController.js)
- [homematch-backend/src/controllers/subscriptionController.js](homematch-backend/src/controllers/subscriptionController.js)
- [homematch-backend/src/controllers/subscriptionPaymentController.js](homematch-backend/src/controllers/subscriptionPaymentController.js)
- [homematch-backend/src/controllers/uploadController.js](homematch-backend/src/controllers/uploadController.js)
- [homematch-backend/src/middleware/authMiddleware.js](homematch-backend/src/middleware/authMiddleware.js)
- [homematch-backend/src/middleware/checkListingLimit.js](homematch-backend/src/middleware/checkListingLimit.js)
- [homematch-backend/src/middleware/uploadMiddleware.js](homematch-backend/src/middleware/uploadMiddleware.js)
- [homematch-backend/src/models/Appointment.js](homematch-backend/src/models/Appointment.js)
- [homematch-backend/src/models/Conversation.js](homematch-backend/src/models/Conversation.js)
- [homematch-backend/src/models/DesignCatalogItem.js](homematch-backend/src/models/DesignCatalogItem.js)
- [homematch-backend/src/models/Message.js](homematch-backend/src/models/Message.js)
- [homematch-backend/src/models/Notification.js](homematch-backend/src/models/Notification.js)
- [homematch-backend/src/models/Property.js](homematch-backend/src/models/Property.js)
- [homematch-backend/src/models/PurchaseOffer.js](homematch-backend/src/models/PurchaseOffer.js)
- [homematch-backend/src/models/RoomDesign.js](homematch-backend/src/models/RoomDesign.js)
- [homematch-backend/src/models/SellerSubscription.js](homematch-backend/src/models/SellerSubscription.js)
- [homematch-backend/src/models/SubscriptionPayment.js](homematch-backend/src/models/SubscriptionPayment.js)
- [homematch-backend/src/models/SubscriptionPaymentSettings.js](homematch-backend/src/models/SubscriptionPaymentSettings.js)
- [homematch-backend/src/models/SubscriptionPlan.js](homematch-backend/src/models/SubscriptionPlan.js)
- [homematch-backend/src/models/User.js](homematch-backend/src/models/User.js)
- [homematch-backend/src/routes/adminRoutes.js](homematch-backend/src/routes/adminRoutes.js)
- [homematch-backend/src/routes/appointmentRoutes.js](homematch-backend/src/routes/appointmentRoutes.js)
- [homematch-backend/src/routes/authRoutes.js](homematch-backend/src/routes/authRoutes.js)
- [homematch-backend/src/routes/chatRoutes.js](homematch-backend/src/routes/chatRoutes.js)
- [homematch-backend/src/routes/notificationRoutes.js](homematch-backend/src/routes/notificationRoutes.js)
- [homematch-backend/src/routes/offerRoutes.js](homematch-backend/src/routes/offerRoutes.js)
- [homematch-backend/src/routes/propertyRoutes.js](homematch-backend/src/routes/propertyRoutes.js)
- [homematch-backend/src/routes/roomDesignRoutes.js](homematch-backend/src/routes/roomDesignRoutes.js)
- [homematch-backend/src/routes/subscriptionPaymentRoutes.js](homematch-backend/src/routes/subscriptionPaymentRoutes.js)
- [homematch-backend/src/routes/subscriptionRoutes.js](homematch-backend/src/routes/subscriptionRoutes.js)
- [homematch-backend/src/routes/uploadRoutes.js](homematch-backend/src/routes/uploadRoutes.js)
- [homematch-backend/src/services/designCatalogService.js](homematch-backend/src/services/designCatalogService.js)
- [homematch-backend/src/services/designPriceService.js](homematch-backend/src/services/designPriceService.js)
- [homematch-backend/src/services/designShareService.js](homematch-backend/src/services/designShareService.js)
- [homematch-backend/src/services/subscriptionService.js](homematch-backend/src/services/subscriptionService.js)
### homematch-web\src
- [homematch-web/src/App.jsx](homematch-web/src/App.jsx)
- [homematch-web/src/Components/Admin/AdminDashboard.jsx](homematch-web/src/Components/Admin/AdminDashboard.jsx)
- [homematch-web/src/Components/Admin/AdminSidebar.jsx](homematch-web/src/Components/Admin/AdminSidebar.jsx)
- [homematch-web/src/Components/Admin/PropertyTable.jsx](homematch-web/src/Components/Admin/PropertyTable.jsx)
- [homematch-web/src/Components/Admin/StatCard.jsx](homematch-web/src/Components/Admin/StatCard.jsx)
- [homematch-web/src/Components/Admin/SubscriptionManagement.jsx](homematch-web/src/Components/Admin/SubscriptionManagement.jsx)
- [homematch-web/src/Components/Admin/UserManagement.jsx](homematch-web/src/Components/Admin/UserManagement.jsx)
- [homematch-web/src/Components/ProtectedRoute.jsx](homematch-web/src/Components/ProtectedRoute.jsx)
- [homematch-web/src/Components/Seller/AddProperty.jsx](homematch-web/src/Components/Seller/AddProperty.jsx)
- [homematch-web/src/Components/Seller/EditProperty.jsx](homematch-web/src/Components/Seller/EditProperty.jsx)
- [homematch-web/src/Components/Seller/FloorPlanEditor.jsx](homematch-web/src/Components/Seller/FloorPlanEditor.jsx)
- [homematch-web/src/Components/Seller/MySubscription.jsx](homematch-web/src/Components/Seller/MySubscription.jsx)
- [homematch-web/src/Components/Seller/PurchaseOffers.jsx](homematch-web/src/Components/Seller/PurchaseOffers.jsx)
- [homematch-web/src/Components/Seller/SellerDashboard.jsx](homematch-web/src/Components/Seller/SellerDashboard.jsx)
- [homematch-web/src/Components/Seller/SellerPropertyTable.jsx](homematch-web/src/Components/Seller/SellerPropertyTable.jsx)
- [homematch-web/src/Components/Seller/SellerSidebar.jsx](homematch-web/src/Components/Seller/SellerSidebar.jsx)
- [homematch-web/src/Components/Seller/SubscriptionCheckout.jsx](homematch-web/src/Components/Seller/SubscriptionCheckout.jsx)
- [homematch-web/src/Components/Seller/SubscriptionPlans.jsx](homematch-web/src/Components/Seller/SubscriptionPlans.jsx)
- [homematch-web/src/Components/Subscription/SubscriptionLayout.jsx](homematch-web/src/Components/Subscription/SubscriptionLayout.jsx)
- [homematch-web/src/Components/Subscription/SubscriptionUI.jsx](homematch-web/src/Components/Subscription/SubscriptionUI.jsx)
- [homematch-web/src/main.jsx](homematch-web/src/main.jsx)
- [homematch-web/src/pages/ForgotPassword.jsx](homematch-web/src/pages/ForgotPassword.jsx)
- [homematch-web/src/pages/Login.jsx](homematch-web/src/pages/Login.jsx)
- [homematch-web/src/pages/Register.jsx](homematch-web/src/pages/Register.jsx)
- [homematch-web/src/pages/ResetPassword.jsx](homematch-web/src/pages/ResetPassword.jsx)
- [homematch-web/src/services/Api.js](homematch-web/src/services/Api.js)
- [homematch-web/src/services/subscriptionFormat.js](homematch-web/src/services/subscriptionFormat.js)
- [homematch-web/src/services/useSubscriptionResource.js](homematch-web/src/services/useSubscriptionResource.js)
### HomeMatchMobile\src
- [HomeMatchMobile/src/components/FloorPlanViewer.jsx](HomeMatchMobile/src/components/FloorPlanViewer.jsx)
- [HomeMatchMobile/src/components/PropertyCard.jsx](HomeMatchMobile/src/components/PropertyCard.jsx)
- [HomeMatchMobile/src/components/PropertyMap.jsx](HomeMatchMobile/src/components/PropertyMap.jsx)
- [HomeMatchMobile/src/navigation/AppNavigator.jsx](HomeMatchMobile/src/navigation/AppNavigator.jsx)
- [HomeMatchMobile/src/screens/AppointmentScreen.jsx](HomeMatchMobile/src/screens/AppointmentScreen.jsx)
- [HomeMatchMobile/src/screens/ChatScreen.jsx](HomeMatchMobile/src/screens/ChatScreen.jsx)
- [HomeMatchMobile/src/screens/CreateAppointmentScreen.jsx](HomeMatchMobile/src/screens/CreateAppointmentScreen.jsx)
- [HomeMatchMobile/src/screens/CreateOfferScreen.jsx](HomeMatchMobile/src/screens/CreateOfferScreen.jsx)
- [HomeMatchMobile/src/screens/DesignPriceSummaryScreen.jsx](HomeMatchMobile/src/screens/DesignPriceSummaryScreen.jsx)
- [HomeMatchMobile/src/screens/FavoriteScreen.jsx](HomeMatchMobile/src/screens/FavoriteScreen.jsx)
- [HomeMatchMobile/src/screens/HomeScreen.jsx](HomeMatchMobile/src/screens/HomeScreen.jsx)
- [HomeMatchMobile/src/screens/LoginScreen.jsx](HomeMatchMobile/src/screens/LoginScreen.jsx)
- [HomeMatchMobile/src/screens/MessagesScreen.jsx](HomeMatchMobile/src/screens/MessagesScreen.jsx)
- [HomeMatchMobile/src/screens/MyDesignsScreen.jsx](HomeMatchMobile/src/screens/MyDesignsScreen.jsx)
- [HomeMatchMobile/src/screens/MyOffersScreen.jsx](HomeMatchMobile/src/screens/MyOffersScreen.jsx)
- [HomeMatchMobile/src/screens/NotificationScreen.jsx](HomeMatchMobile/src/screens/NotificationScreen.jsx)
- [HomeMatchMobile/src/screens/PrivacyPolicyScreen.jsx](HomeMatchMobile/src/screens/PrivacyPolicyScreen.jsx)
- [HomeMatchMobile/src/screens/ProfileScreen.jsx](HomeMatchMobile/src/screens/ProfileScreen.jsx)
- [HomeMatchMobile/src/screens/PropertyDetailScreen.jsx](HomeMatchMobile/src/screens/PropertyDetailScreen.jsx)
- [HomeMatchMobile/src/screens/RegisterScreen.jsx](HomeMatchMobile/src/screens/RegisterScreen.jsx)
- [HomeMatchMobile/src/screens/RoomCustomizerScreen.jsx](HomeMatchMobile/src/screens/RoomCustomizerScreen.jsx)
- [HomeMatchMobile/src/screens/SearchScreen.jsx](HomeMatchMobile/src/screens/SearchScreen.jsx)
- [HomeMatchMobile/src/screens/SellerAppointmentScreen.jsx](HomeMatchMobile/src/screens/SellerAppointmentScreen.jsx)
- [HomeMatchMobile/src/screens/SellerHomeScreen.jsx](HomeMatchMobile/src/screens/SellerHomeScreen.jsx)
- [HomeMatchMobile/src/screens/SharedDesignScreen.jsx](HomeMatchMobile/src/screens/SharedDesignScreen.jsx)
- [HomeMatchMobile/src/services/api.js](HomeMatchMobile/src/services/api.js)
- [HomeMatchMobile/src/services/appointmentService.js](HomeMatchMobile/src/services/appointmentService.js)
- [HomeMatchMobile/src/services/authService.js](HomeMatchMobile/src/services/authService.js)
- [HomeMatchMobile/src/services/chatService.js](HomeMatchMobile/src/services/chatService.js)
- [HomeMatchMobile/src/services/designPdfService.js](HomeMatchMobile/src/services/designPdfService.js)
- [HomeMatchMobile/src/services/favoriteService.js](HomeMatchMobile/src/services/favoriteService.js)
- [HomeMatchMobile/src/services/notificationService.js](HomeMatchMobile/src/services/notificationService.js)
- [HomeMatchMobile/src/services/offerService.js](HomeMatchMobile/src/services/offerService.js)
- [HomeMatchMobile/src/services/roomDesignService.js](HomeMatchMobile/src/services/roomDesignService.js)
- [HomeMatchMobile/src/utils/designBudget.js](HomeMatchMobile/src/utils/designBudget.js)
- [HomeMatchMobile/src/utils/designPdfHtml.js](HomeMatchMobile/src/utils/designPdfHtml.js)
