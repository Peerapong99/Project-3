# Design Price Summary — Phase 7 validation

Date: 15 October 2026, Asia/Bangkok.

## Results

- Backend: 23 checks passed (catalog, calculation, budget, PDF document content, chat authorization and workflow).
- The workflow test uses real Mongoose models, indexes and a fresh isolated MongoMemoryServer database. It runs real HTTP/JWT requests as buyer, seller, admin and another buyer. It does not connect to the application database.
- Mobile: the drag regression test passed. It verifies that a mounted draggable item uses updated callbacks and canvas bounds after rerender.
- ESLint: changed feature files and the new mobile test passed with no errors (existing style warnings are not treated as failures).
- Android: debug APK assembled and installed with adb install -r, preserving app data.
- Emulator API 34: opened an existing MyDesigns entry and price summary without saving or changing its layout, name, budget or reference prices.
- PDF: exported a real two-page document through Android PrintManager, saved it in Downloads and opened it from Files in the installed PDF viewer. Visually confirmed Thai labels, images, room layout, table, missing-price/area disclosures and budget/total section. No storage permission prompt appeared.
- No chat message was sent to a real seller during device checks. Sharing, notification creation, seller viewing and immutable copies were verified with isolated test accounts and real MongoDB in the workflow test.

## Fixes found during this phase

1. DraggableFurniture retained its initial PanResponder callbacks and canvas bounds. A ref now supplies the latest item, callbacks and clamp function, ensuring a drag release updates the current parent state rather than an old loading-state closure.
2. React Native's Jest preset did not transform .jsx files. jest.config.js now includes .jsx in the Babel transform.
3. The existing development backend process had not loaded the new routes. It was restarted and the real summary screen then loaded correctly. The backend development service is running again on port 3000.
4. PDF WebView interception rejected the inline data URL used for the main HTML document. The native module now permits that document while keeping external requests blocked and limiting illustrations to the bundled allowlist. Incidental favicon errors no longer invalidate a valid document. Actual main-document/image errors still fail export.

## Evidence

- `homematch-pdf-preview.png`: Android print preview.
- `homematch-pdf-opened.png`: saved PDF opened in Android's PDF viewer.
- `phase7-pdf-artifacts/HomeMatch-ห้องนอนใหญ่.pdf`: actual exported PDF (2 pages, approximately 6.9 MB).
- `../tests/designWorkflow.test.js`: isolated MongoDB workflow test.
- `../../HomeMatchMobile/__tests__/RoomCustomizerDrag.test.jsx`: drag regression test.

## Re-run

From homematch-backend:

```powershell
npm run test:designs
```

From HomeMatchMobile:

```powershell
node node_modules/jest/bin/jest.js __tests__/RoomCustomizerDrag.test.jsx --runInBand
```

From HomeMatchMobile/android:

```powershell
.\gradlew.bat :app:assembleDebug --offline
```

## Limits of verification

Only the available API 34 emulator was tested visually. API 24/29/36, physical devices and iOS were not exercised. Buyer/seller UI switching on two devices was not tested; their backend authorization and sharing workflow were covered by isolated integration tests. PDF text extraction may represent Thai combining glyphs differently from their visible rendering; the visual PDF renders Thai correctly on the tested viewer.

Real furniture/material reference prices and measured floor/wall areas are still not supplied. Those entries remain unknown and excluded from the known subtotal, rather than treated as free. The PDF sample intentionally shows missing-data disclosures. PNG originals are packaged for offline export and make the sample PDF approximately 6.9 MB.