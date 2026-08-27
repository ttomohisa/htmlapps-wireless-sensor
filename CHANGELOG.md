# Changelog

## 0.9.0 - 2026-08-27

First public test release.

- Added receiver and smartphone-sensor roles in one single-HTML application.
- Added fully serverless WebRTC negotiation with `RTCPeerConnection({ iceServers: [] })`; no signaling, STUN, or TURN server is used.
- Added camera-first QR handoff in both directions. PC offer and phone answer payloads are split into low-density QR pages and reassembled automatically.
- Added embedded `jsQR` fallback for desktop environments where native `BarcodeDetector` QR decoding is unavailable.
- Added rear-camera preference, camera selection, scan resolution display, fullscreen QR display, and copy/paste fallback.
- Added separate unreliable sensor and reliable control DataChannels.
- Added acceleration, acceleration including gravity, rotation rate, orientation, measured sample rate, and RTT display.
- Added CSS 3D phone preview, rolling charts, pose zeroing, and CSV / JSON recording.
- Added motion-sensor permission handling and screen wake-lock support.
- Added Japanese / English UI, help, privacy explanation, and same-LAN diagnostics.
- Prevented browser auto-translation overlays from interfering with the built-in bilingual UI.
- Filled missing English labels for segmented reply-QR navigation and fullscreen controls.
- Added GitHub Pages build/deploy workflows and offline single-HTML build tooling.
