# Changelog

## 0.11.0 - 2026-08-27

- Added NTP-like clock synchronization over the existing reliable WebRTC control DataChannel. Each phone is sampled in a burst at connection time, re-synchronized periodically, and re-synchronized when the receiver tab becomes visible again.
- Added per-sensor clock models that estimate phone-to-PC offset, long-run clock drift, minimum RTT, and a user-facing synchronization uncertainty. Low-RTT samples are weighted more heavily.
- Changed multi-sensor chart timing and exported shared timestamps to prefer the corrected sensor clock instead of packet receive time, while retaining receive-time fields as diagnostics/fallbacks.
- Added synchronization quality to the live header and per-sensor roster. JSON recording format is now `browser-kitty-wireless-sensor-v3`; CSV includes synchronized/receive elapsed time, clock offset, drift, and uncertainty.
- Added measurement modes: Motion, Vibration, Tilt, Rotation, and Free view. Each mode changes the chart focus and provides mode-specific live summary metrics.
- Added vibration RMS/peak/range over a rolling 2-second window and combined rotation/tilt metrics without introducing external dependencies or runtime network access.

## 0.10.0 - 2026-08-27

- Added simultaneous measurement from up to four smartphones, with one independent WebRTC peer connection per sensor.
- Added a connected-sensor roster with per-device selection, sample rate, RTT, add/disconnect controls, and independent pose zeroing.
- Added selected-sensor and all-sensor overlay chart modes. Overlay mode uses a per-sensor color and per-axis line pattern.
- Changed recording to use the receiver PC clock as the shared timeline so samples from multiple phones can be compared in one CSV/JSON session.
- Added sensor ID, sensor name, device label, receiver elapsed time, and per-sensor elapsed time to exports. JSON recording format is now `browser-kitty-wireless-sensor-v2`.
- Kept signaling, STUN, TURN, runtime APIs, and server-side storage out of the design; each phone still connects through the QR handoff flow independently.
- Added responsive multi-sensor UI for 320px and wider layouts.
- Reclaim a sensor slot automatically when a peer connection fails, while treating transient WebRTC `disconnected` states as recoverable so the other sensors keep running.

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
