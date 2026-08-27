# Wireless Sensor verification checklist

## Build

1. Run `build-standalone.bat` on the supported Windows environment.
2. Confirm `scripts/check-repository.ps1` passes.
3. Confirm both `dist/index.html` and `dist/index.self-extract.html` are generated.
4. Review `dist/build-size-report.json`.

## Static / offline UI

1. Open `dist/index.html` directly with `file://`.
2. Confirm the role selector appears with no network access.
3. Switch Japanese / English.
4. Open and close the help dialog with button, Escape, and backdrop.
5. Choose receiver mode and create connection information.
6. Confirm segmented offer QR pages are generated locally and can be paged/fullscreened without network access.
7. Confirm the sensor role exposes in-app QR scanning plus a manual connection-code fallback.
8. Confirm browser developer tools show no fetch/XHR/WebSocket/API request.

## Same-LAN P2P

Use two devices on the same Wi-Fi / LAN.

1. Open the standalone page on both receiver and phone.
2. On the receiver, create the offer and show the segmented QR pages.
3. On the phone, choose sensor mode, press **Scan PC QR with camera**, and scan the PC QR pages.
4. Confirm the phone reconstructs the offer and creates an answer locally.
5. Return the answer by PC-camera scanning of the phone QR pages or by copy/paste fallback.
6. Confirm the peer reaches `connected` without configured STUN/TURN.
7. Start phone sensor permission from the explicit button.
8. Move/rotate the phone and confirm values, 3D preview, and chart update.
9. Confirm measured sample rate and RTT update.
10. Set current pose to zero and confirm orientation display changes without clearing the stream.
11. Record samples, stop, edit output filename, and save CSV and JSON.
12. Open both exported files and verify data is present.
13. Stop sending and disconnect.

## Negative network test

When possible, repeat across a client-isolating guest Wi-Fi or different networks and confirm failure is reported clearly instead of claiming universal connectivity.

## Browser checks

Test current stable desktop Chromium, Firefox, Safari where available, plus at least one current iPhone/iPad Safari and one Android Chromium device. Record API-specific failures instead of silently hiding them.
