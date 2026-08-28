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
5. Choose receiver mode and confirm the segmented offer QR is created automatically.
6. Confirm offer QR pages can be paged/fullscreened without network access.
7. Choose sensor mode and confirm the in-app QR camera opens automatically; verify the manual connection-code fallback remains available.
8. Confirm browser developer tools show no fetch/XHR/WebSocket/API request.

## Same-LAN P2P

Use two devices on the same Wi-Fi / LAN.

1. Open the standalone page on both receiver and phone.
2. On the receiver, choose receiver mode and confirm the offer QR is created automatically.
3. On the phone, choose sensor mode and scan the PC QR pages with the camera that opens automatically.
4. Confirm the phone reconstructs and stores the offer but does **not** create an answer or start its PeerConnection yet.
5. On the receiver, start **Scan phone reply QR with camera** and wait until the camera preview is visible. Then press **Create reply QR** on the phone.
6. Return the answer by PC-camera scanning of the phone QR pages or by copy/paste fallback. Confirm both sides show ICE gathering as complete before their QR/code is presented, and that diagnostics list at least one local candidate on each device.
7. While the receiver is still scanning reply pages, simulate/observe a phone-side pre-connection ICE failure. Confirm the phone automatically creates a new PeerConnection/answer QR set, the PC scanner remains open, partial pages from the old QR session are discarded when the new session id appears, and regeneration stops after at most three automatic retries.
8. Intentionally retry pairing after a failed attempt and confirm the new attempt gets fresh QR data, the previous slot is released, and no stale failure/reconnect message overwrites the new attempt.
9. On a blocked/client-isolated network, confirm the diagnostic panel reports local/remote candidate classes and a failed/unestablished candidate pair instead of silently timing out during QR transfer.
10. Confirm the peer reaches `connected` without configured STUN/TURN.
11. Start phone sensor permission from the explicit button.
12. Move/rotate the phone and confirm values, 3D preview, and chart update.
13. Confirm measured sample rate and RTT update.
14. Set current pose to zero and confirm orientation display changes without clearing the stream.
15. Connect a second phone when available and confirm independent sensor selection plus stacked/overlay comparison.
16. Record samples, add a marker, stop, and confirm post-recording analysis opens.
17. Save CSV, session JSON, and a standalone HTML report; open each export and verify data is present.
18. Reload the saved session JSON and confirm analysis, sensor metadata/positions, markers, impacts, and report generation are restored without reconnecting phones.
19. Exercise at least one experiment preset, impact timing, and FFT on real motion data.
20. Switch phone load profiles, toggle Screen Wake Lock, and confirm send-rate/UI-rate indicators remain sensible during a longer run.
21. Stop sending and disconnect one sensor; confirm other connected sensors continue running.

## Negative network test

When possible, repeat across a client-isolating guest Wi-Fi or different networks and confirm failure is reported clearly instead of claiming universal connectivity.

## Browser checks

Test current stable desktop Chromium, Firefox, Safari where available, plus at least one current iPhone/iPad Safari and one Android Chromium device. Record API-specific failures instead of silently hiding them.
