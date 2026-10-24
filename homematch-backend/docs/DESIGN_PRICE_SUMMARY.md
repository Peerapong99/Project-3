# Design Price Summary — Phase 2

Existing designs are still stored by RoomDesign. No layout fields or editor behavior change in this phase.

## Reference catalog

GET /api/room-designs/catalog requires a valid JWT. The 22 keys match furniture.type, selectedFloor.id and selectedWall.id in RoomCustomizerScreen. Each item returns category, key, name, unit, currency (THB), unitPrice, priceStatus, priceSource and updatedAt.

No sample prices are seeded. A missing database record returns unitPrice: null and priceStatus: missing. Explicit numeric zero is an available price. Never convert null to zero in the summary.

Furniture prices are per piece. Floor/wall material prices are per square metre. Actual room/wall area is not currently available: the editor's 5 x 6 metre canvas is a design placeholder and must not silently become verified material quantity.

PUT /api/room-designs/catalog/:category/:key requires an admin JWT. Body:

```json
{"unitPrice": null, "priceSource": ""}
```

Set unitPrice to a verified THB amount and priceSource to its actual reference to register a price. The API rejects negative, nonnumeric, unsafe and more-than-two-decimal amounts. Only existing editor catalog keys are accepted. Prices sent inside a mobile design are not reference prices.

No database migration or startup seed is required: catalog records are created when an admin saves a verified price. Design snapshots/calculation are implemented in subsequent phases, not in this catalog endpoint.

## Validation

```powershell
cd homematch-backend
node --test tests/designCatalog.test.js
```

The API test uses an isolated HTTP listener and mocked database methods; it verifies real JWT middleware, admin restrictions, catalog defaults and invalid-price handling. It does not verify MongoDB persistence.

## Android Emulator smoke check

1. Start the backend with npm run dev and Metro in HomeMatchMobile with npm start.
2. Run npm run android with the emulator running. The existing mobile base URL is http://10.0.2.2:3000/api.
3. Log in, open a room, place multiple furniture items, move/rotate them and change floor/wall selections.
4. Save and reopen from MyDesigns. Confirm the positions, item count, dimensions and rotation remain intact.
5. In Postman, use a buyer JWT to GET http://localhost:3000/api/room-designs/catalog; verify unpriced entries are null. A buyer PUT must return 403; no token must return 401.
6. Use an admin JWT to register a real reference price through the PUT endpoint, then GET as buyer and verify the price/source. Reset a price with unitPrice null if required.

Phase 2 adds no summary screen yet. Home purchase price is untouched and must remain separate from decoration estimates.
## Phase 3 — Summary screen

The editor now offers “เสร็จสิ้นการออกแบบ”. It confirms the action, saves through the existing PUT endpoint, verifies the returned design ID and opens DesignPriceSummary. A failed save does not navigate; a failed initial load blocks edits/saves to prevent overwriting the saved design. Existing MyDesigns entries also have a summary action.

GET /api/room-designs/:designId/price-summary requires JWT and queries both _id and userId. It uses server catalog prices, counts placed instances by furniture.type, and never uses client unitPrice or the property's house price in the decoration total. Unpriced items/unknown area are listed separately; grandTotal is the known subtotal when isComplete is false. Furniture fields are not mutated by the calculator.

Canvas dimensions are saved with new designs so the preview can scale existing pixel positions. Older designs remain readable; their preview fits the saved item bounds and indicates that the viewport was not recorded. The floor/wall preview is illustrative, not a construction drawing.

Test calculation and API authorization:

```powershell
node --test tests/designCatalog.test.js tests/designPrice.test.js
```

Android verification:
1. Place two identical furniture pieces and another different type; move and rotate them. Press “เสร็จสิ้นการออกแบบ” and confirm.
2. Confirm property/room name, preview and item counts. With no configured prices, items must say “ยังไม่มีข้อมูลราคา”; the known subtotal must be clearly labelled, with omitted items listed.
3. Configure a verified reference price as admin and reload the summary; confirm unit price multiplied by the actual instance count. Floor/wall quantities remain unknown until real measured areas are introduced.
4. Tap “กลับไปแก้ไขแบบเดิม”; confirm positions and rotations remain. Save a change, open summary again and confirm the latest state.
5. Open an older entry from MyDesigns using “ดูสรุปราคาตกแต่ง”. Check that it loads without migration.
6. Stop the backend before finishing; confirm the summary does not open on save failure. If loading a room fails, reopen it after restoring connectivity rather than saving an empty layout.
7. Request another user's design summary with a different JWT; it must return 404. Without JWT it must return 401.

Budget persistence, stored price snapshots, PDF export and chat sharing belong to subsequent phases and are not added in Phase 3.
## Phase 4 — Budget and saved price snapshots

RoomDesign now includes designName, budget (nullable), estimatedTotal (known subtotal) and priceSnapshot. No parallel saved-design model is introduced. The original furniture, selectedFloor/selectedWall, propertyId and timestamps remain in RoomDesign.

PATCH /api/room-designs/:designId/price-summary accepts designName, budget and expectedUpdatedAt. It verifies JWT ownership, validates a nonnegative budget with up to two decimals and recalculates prices on the server. Client estimatedTotal/priceSnapshot fields are ignored. The atomic update checks updatedAt to reject concurrent modifications with 409. No layout fields are changed by the snapshot save.

GET returns summary (saved snapshot if present), currentSummary (live catalog prices) and summarySource. The summary screen defaults to saved prices and provides an explicit toggle to current reference prices. Saving always uses current server prices, with confirmation. Editing/saving a layout through the original PUT clears its stale snapshot/estimatedTotal but retains name and budget.

Budget input updates the planner immediately: budget, known estimate, remaining balance, overspend and a clamped progress bar. Empty means no budget; zero is a valid budget. Red indicates overspend; green indicates the known subtotal is within budget. Missing-price/area items remain excluded and are disclosed next to the planner.

```powershell
node --test tests/designCatalog.test.js tests/designPrice.test.js tests/designBudget.test.js
```

Android smoke test:
1. Open a summary, enter a name and budget. Try a budget above/below the known subtotal; verify immediate remaining/overspend and green/red progress.
2. Try zero, empty input, negative/pasted text and more than two decimals; invalid values must block saving.
3. Save and confirm, leave, then reopen via MyDesigns. Verify name, budget, snapshot timestamp and amounts persist.
4. Change a reference price as admin. Reopen the design; saved amounts must remain unchanged. Toggle current prices and explicitly save to refresh the snapshot.
5. Return to edit, move/rotate furniture and save. Confirm budget/name remain and the old snapshot is cleared so prices match the latest layout.
6. Open the same design on another client and save a change. Try saving the older summary; verify 409 and use the provided reload action before retrying.

Tests mock database persistence and use actual JWT/HTTP middleware; MongoDB/Android end-to-end verification remains a manual step. PDF and chat sharing are subsequent phases.
## Phase 5 — Android PDF export

No new npm PDF dependency is needed. HomeMatchPdfModule uses Android WebView + PrintManager and opens the system print UI. Choose “Save as PDF / บันทึกเป็น PDF” and the desired destination; the system handles the output document. The app does not request READ/WRITE_EXTERNAL_STORAGE or MANAGE_EXTERNAL_STORAGE. This path uses system printing for all supported Android versions (minSdk 24, targetSdk 36), rather than raw shared-directory writes. Open the saved PDF from Android Files with an installed PDF viewer.

The exported document contains HomeMatch branding, property/design/room names, a reconstructed 2D room preview, furniture/material table with quantities/unit prices/line totals, missing-data notices, budget/remaining/overspend, known total and Bangkok-local generation date. UTF-8 HTML and Android system font fallback provide Thai rendering; verify combining marks and table pagination on target devices.

Images are the existing src/assets PNGs, packaged through the Android asset source set. The printing WebView intercepts only allowlisted bundled images, disables JavaScript and blocks network/file/content access. No design is uploaded to a PDF service. HTML-escaped names and references cannot inject document markup.

The button re-fetches the summary with JWT and checks the design updatedAt before export; changed layouts require a reload. The selected saved/current price mode is respected. Name/budget are taken from the visible inputs and exporting does not save or overwrite the design. The native promise reports that the print dialog opened, never that a file was saved: users may cancel at any point. iOS export is not implemented in this Android phase.

Rebuild the installed Android app after this change; a Metro reload alone cannot register the native module:

```powershell
cd HomeMatchMobile
npm run android
```

Checks:

```powershell
# From homematch-backend
node --test tests/designCatalog.test.js tests/designPrice.test.js tests/designBudget.test.js tests/designPdf.test.js
# From HomeMatchMobile/android
.\gradlew.bat :app:compileDebugKotlin :app:mergeDebugAssets --offline
```

Emulator/device verification:
1. Open a saved summary; press “ดาวน์โหลดสรุปราคา PDF” and confirm.
2. In the Android print preview choose Save as PDF, inspect the preview, then select Downloads or another folder and save.
3. Open the PDF in Files. Check Thai vowels/tone marks, property/design names, furniture preview positions/rotation, image availability and table totals.
4. Repeat with an old design without canvasSize, no furniture, missing prices, long Thai names and enough furniture categories for multiple pages. Confirm unknown area/price is disclosed and excluded.
5. Try zero/no budget and over-budget amounts; compare PDF numbers with the screen.
6. Cancel the print dialog and export again. No success toast should claim a cancelled PDF was saved.
7. Stop the backend or use an expired JWT before exporting; verify a recoverable error instead of a stale private export. Change the design elsewhere and confirm the reload requirement.
8. Test at least Android API 24, 29 and 36 and confirm there is no storage-permission prompt. A PDF viewer must be installed to open the saved file.

References: https://developer.android.com/training/printing/html-docs and https://developer.android.com/training/data-storage/shared/documents-files.

Automated HTML tests and Kotlin compilation do not replace print-preview/PDF inspection on the emulator or physical devices. Chat sharing remains Phase 6.
## Phase 6 — Share through existing Chat

The summary's “ส่งแบบให้ผู้ขาย” asks for explicit confirmation to share furniture positions, materials, name, budget and price estimate. Unsaved name/budget edits must first be saved. The existing startConversation flow opens the property's buyer/seller chat; the existing sendMessage flow attaches a server-generated sharedDesign snapshot to the existing Message model and retains conversation previews/notifications. There is no new Chat or saved-design collection.

POST /api/chat/conversations/:conversationId/messages accepts designId, expectedUpdatedAt and pricingMode (saved/current) alongside the normal message. Sharing requires the conversation buyer, the design owner, the same property, an approved listing and the listing's current seller. Prices and layout come from the server; supplied sharedDesign data is ignored. Saved mode uses the server snapshot if present; otherwise reference prices are calculated. The shared copy is immutable: future private edits do not update the sent message.

GET /api/chat/conversations/:conversationId/messages/:messageId/design checks JWT and conversation membership and requires the message to belong to that conversation. Only the conversation buyer/seller can view the attached copy. The normal private RoomDesign endpoints remain owner-only; sharing does not grant access to them. The shared view is read-only and has no edit/save/share actions.

```powershell
node --test tests/designCatalog.test.js tests/designPrice.test.js tests/designBudget.test.js tests/designPdf.test.js tests/designShare.test.js
```

Emulator smoke test:
1. As buyer, open a summary and save the desired name/budget. Press “ส่งแบบให้ผู้ขาย”, review the disclosure and cancel: no message should be sent.
2. Confirm sharing. The existing property's Chat opens with a design card. Tap it to inspect the room preview and price summary.
3. Sign in as that property's seller, open the same Chat and tap the card. Verify the same shared positions, material selections, budget and estimate; no editing controls are available.
4. As buyer, edit the original layout or budget. Reopen the previously shared message as seller: it must still show the original sent copy. Share again to send the updated design.
5. With another account, request the shared GET URL; expect 404. Try sharing a design into a different property's conversation; expect 400. Expired/missing JWT must be rejected.
6. Send ordinary buyer/seller messages and verify existing chat previews/read receipts still work. No private design fields may be injected through a normal message body.

The seller Mobile Chat supports the shared-design card. The repository currently has no seller Web Chat page; this phase extends the existing mobile Chat and backend rather than introducing another chat system. Tests use mocked database methods and real HTTP/JWT middleware; MongoDB persistence and multi-account device flows still require end-to-end checks in Phase 7.

## Phase 7 results

See [DESIGN_PHASE7_REPORT.md](./DESIGN_PHASE7_REPORT.md) for completed integration/device checks, fixes, evidence and remaining platform coverage.
