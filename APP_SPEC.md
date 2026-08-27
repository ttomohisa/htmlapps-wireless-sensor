# APP_SPEC.md — Wireless Sensor

## 1. Product identity

- **Name:** Wireless Sensor
- **One-sentence purpose:** Turn a smartphone into a wireless motion sensor and stream acceleration, rotation, and orientation directly to another browser using WebRTC.
- **Primary users:** People doing quick motion experiments, prototyping, education, hobby measurement, or browser API exploration without installing an app.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`
- **Version:** 0.9.0

## 2. Product principles

- The application is a single-HTML Browser Kitty tool.
- Runtime signaling servers are forbidden.
- STUN and TURN servers are forbidden.
- There is no account, analytics, telemetry, cloud storage, WebSocket, API, or background upload.
- Connection metadata is handed directly between the two users/devices as a QR code or copy/paste code.
- Sensor samples travel only over the established WebRTC DataChannel.
- The default CSP keeps `connect-src 'none'`.
- Japanese and English live in the same HTML.

## 3. Core user flow

### Receiver (PC / tablet)

1. Open Wireless Sensor and choose **View measurements on this device**.
2. Press **Create connection info**.
3. The app creates a WebRTC offer using `RTCPeerConnection({ iceServers: [] })`, waits for local ICE gathering, then serializes it into a compact connection code.
4. Split the offer code into low-density QR pages and cycle them on the PC display. Fullscreen and manual page navigation are available.
5. On the phone, open Wireless Sensor, choose the sensor role, and scan the PC QR pages with the in-app camera scanner. Prefer the rear camera, accept pages in any order, and automatically reconstruct the offer when all pages have been captured. Copy/paste remains a fallback.
6. Receive the answer by scanning segmented reply QR pages shown on the phone with the PC camera. Prefer native `BarcodeDetector` when QR is supported; otherwise use embedded `jsQR`. Copy/paste remains a fallback.
7. Load the answer. Once connected, show live sensor values, a 3D phone indicator, chart, measured sample rate, and RTT.
8. Optionally set the current pose to zero.
9. Start/stop recording and save the in-memory samples as CSV or JSON.

### Sensor (phone)

1. Open Wireless Sensor, choose **Use this phone as the sensor**, and press **Scan PC QR with camera**.
2. Scan the receiver's segmented offer QR pages. When all pages are collected, the offer is reconstructed automatically. Manual connection-code paste remains available as a fallback.
3. Generate a WebRTC answer locally and show both a segmented QR and copyable reply code.
4. Return the answer to the receiver.
5. Once the DataChannels are connected, press **Start sensor**. Permission requests must happen from this explicit user gesture.
6. Stream motion samples until **Stop sending** is pressed or the connection closes.

## 4. WebRTC design

- Create `RTCPeerConnection` with `iceServers: []`.
- No trickle signaling. Wait for ICE gathering to complete (with a bounded timeout), then serialize the complete local description.
- Two DataChannels:
  - `sensor`: `ordered: false`, `maxRetransmits: 0`. Fresh data is more important than delayed retransmission.
  - `control`: reliable and ordered. Used for hello metadata and ping/pong RTT measurement.
- v0.9 targets devices on the same Wi-Fi / LAN.
- Client-isolating networks, many guest Wi-Fi networks, separate NATs, VPN boundaries, and networks that block peer-to-peer traffic may fail. This is an intentional consequence of the no-server requirement.

## 5. Signaling code format

- Schema prefix: `ws1`.
- JSON payload: `{ "v": 1, "type": "offer|answer", "sdp": "..." }`.
- Prefer browser-native `CompressionStream('gzip')` when available; otherwise use plain UTF-8 JSON.
- Base64url encode the bytes.
- Prefix compressed data with `ws1.g.` and uncompressed data with `ws1.j.`.
- Never persist connection codes to localStorage.

## 6. Sensor data

Use `devicemotion` and `deviceorientation` as the v0.9 baseline.

Each sensor packet contains:

- protocol version
- monotonically increasing sequence number
- sensor-side `performance.now()` timestamp
- browser-reported `DeviceMotionEvent.interval`
- acceleration without gravity: x/y/z when available
- derived acceleration magnitude: √(x² + y² + z²) when all three axes are available
- acceleration including gravity: x/y/z when available
- rotation rate: alpha/beta/gamma when available
- orientation: alpha/beta/gamma and `absolute`

Null is valid when a browser/device does not provide a field.

### Send-rate presets

- Power saving: target about 10 samples/s.
- Standard: target about 30 samples/s (default).
- High frequency: send each received motion event.

These are throttling targets, not promises of exact sensor sampling rates. The receiver shows the measured rate.

## 7. Receiver visualization

- Live numeric values for acceleration, derived acceleration magnitude, rotation rate, and orientation.
- CSS 3D phone preview driven by the current orientation.
- Chart tabs: acceleration / rotation / orientation.
- Rolling windows: 5 / 10 / 30 / 60 seconds.
- Autoscale acceleration and rotation charts with sensible minimum ranges.
- Display measured sample rate and control-channel RTT.
- **Set current pose to zero** offsets orientation display and chart values without mutating the raw recorded samples.

## 8. Recording and export

- Recording happens only on the receiver.
- Samples stay in browser memory; v0.9 does not persist measurement history to localStorage or IndexedDB.
- CSV fields include elapsed time, receive epoch time, sequence, acceleration, derived acceleration magnitude, gravity-included acceleration, rotation rate, orientation, absolute flag, and browser-reported interval.
- JSON contains format metadata, coordinate-system notes, zero-offset metadata, connection privacy metadata, and raw samples.
- The output filename is editable before export.
- Invalid filename characters are sanitized and empty names fall back to `wireless-sensor`.
- CSV uses UTF-8 with BOM for spreadsheet compatibility.

## 9. QR behavior

- QR generation is an embedded build-time dependency (`qrcode-generator` 1.4.4); there is no runtime CDN.
- Both offer and answer handoffs use segmented QR pages carrying only compact `ws1...` signaling data.
- QR pages are deliberately small enough to stay readable on ordinary phone cameras and low-resolution PC webcams.
- The phone offer scanner prefers the rear camera and collects pages in any order.
- PC answer scanning uses native `BarcodeDetector` only when QR is supported, with embedded `jsQR` as the offline fallback.
- QR generation/decoding is available from `file://` as long as camera access is available in the browser context; manual copy/paste remains the fallback.
- QR failure must never block manual copy/paste signaling.

## 10. Sensor permissions and wake lock

- Sensor permission is requested only from the explicit **Start sensor** action.
- Support `DeviceMotionEvent.requestPermission()` / `DeviceOrientationEvent.requestPermission()` when present.
- If supported, use Screen Wake Lock while streaming and re-acquire when the page becomes visible again.
- Failure to acquire wake lock is non-fatal.

## 11. Data and privacy

- No signaling server.
- No STUN server.
- No TURN server.
- No runtime fetch/XHR/WebSocket/EventSource/sendBeacon.
- CSP includes `connect-src 'none'`.
- WebRTC peer traffic is the only runtime inter-device transport.
- Measurements are not uploaded to Browser Kitty.
- Saved CSV/JSON files are created only after an explicit user action.

## 12. Non-goals for v0.9.0

- Cross-internet/NAT traversal.
- TURN fallback.
- Multi-phone simultaneous measurement.
- GPS, magnetometer, microphone, camera, or ambient-light sensing.
- Cloud history or synchronization.
- Scientific calibration certification.
- Background operation while the browser/OS suspends the page.

## 13. UX and accessibility

- Mobile-first from 320px upward.
- Role selection must be understandable without WebRTC terminology.
- Technical terms belong in help/privacy details, not in the primary flow.
- Explicit visible connection steps on both sides.
- All controls have labels or accessible names.
- Keyboard focus is visible.
- Motion respects `prefers-reduced-motion`.
- Status changes are exposed through an `aria-live` region.
- The help dialog is bilingual and synchronized with behavior.
- Do not add a dark-mode switch.

## 14. Browser target

Current stable Chromium, Firefox, and Safari are the intended baseline, but sensor and QR-scanning API availability differs by browser and platform.

- The landing UI and manual signaling flow must work from `file://`.
- Phone sensor permission generally works best from a secure HTTP(S) context.
- QR scanning is the primary signaling UX; manual copy/paste remains available when camera access or decoding is unavailable.

## 15. Acceptance criteria

- Repository follows the Browser Kitty single-HTML template structure.
- `app.config.json` version is `0.9.0`.
- `dependencies.json` pins QR generation to an exact version and records license/homepage.
- `scripts/check-repository.ps1` passes on the supported Windows build environment.
- `build-standalone.ps1` produces readable and self-extracting HTML.
- Generated HTML contains no unresolved build placeholders.
- Runtime CSP retains `connect-src 'none'`.
- Source contains no configured STUN/TURN endpoint and creates WebRTC peers with an empty ICE server list.
- Receiver can create a signaling code without any network API.
- Sensor can consume an offer and produce an answer without any network API.
- Receiver can consume the answer and open the two DataChannels when the local network permits P2P traffic.
- Sensor values can stream through the unreliable sensor channel.
- Control channel ping/pong reports RTT.
- Live values and chart update without rebuilding the full DOM per sample.
- Recording can be started/stopped and exported as user-named CSV and JSON.
- Japanese and English fit at 360px width.

## 16. Known v0.9 limitations

The most important limitation is deliberate: **a fully serverless WebRTC connection cannot rely on signaling, STUN, or TURN infrastructure.** Wireless Sensor therefore prioritizes same-LAN use and transparent failure over universal connectivity.
