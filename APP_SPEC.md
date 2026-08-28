# APP_SPEC.md — Wireless Sensor

## 1. Product identity

- **Name:** Wireless Sensor
- **One-sentence purpose:** Turn up to four smartphones into wireless motion sensors and stream synchronized acceleration, rotation, and orientation directly to a receiver browser using WebRTC.
- **Primary users:** People doing quick motion experiments, prototyping, education, hobby measurement, or browser API exploration without installing an app.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`
- **Version:** 1.0.0

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
2. The receiver creates connection info automatically when this role is selected. **Recreate connection QR** remains available for retry.
3. The app creates a WebRTC offer using `RTCPeerConnection({ iceServers: [] })`, waits for local ICE gathering, then serializes it into a compact connection code.
4. Split the offer code into low-density QR pages and cycle them on the PC display. Fullscreen and manual page navigation are available.
5. On the phone, open Wireless Sensor, choose the sensor role, and scan the PC QR pages with the in-app camera scanner. Prefer the rear camera, accept pages in any order, and automatically reconstruct the offer when all pages have been captured. Copy/paste remains a fallback.
6. Receive the answer by scanning segmented reply QR pages shown on the phone with the PC camera. Prefer native `BarcodeDetector` when QR is supported; otherwise use embedded `jsQR`. Copy/paste remains a fallback.
7. Load the answer. Once connected, add the phone to the receiver's sensor roster.
8. Repeat the same independent QR handoff for additional phones, up to four simultaneous sensors. Existing peer connections stay active while another phone is paired.
9. Select any connected sensor to inspect its live values, 3D phone indicator, measured sample rate, RTT, and per-device zero offset.
10. Switch the chart between the selected sensor and an all-sensor overlay.
11. Start/stop one receiver-side recording session and save the result as CSV, a reloadable session JSON file, or a self-contained HTML report.

### Sensor (phone)

1. Open Wireless Sensor and choose **Use this phone as the sensor**.
2. Selecting the phone-sensor role automatically starts camera scanning. Scan the receiver's segmented offer QR pages. When all pages are collected, the offer is reconstructed automatically. Manual connection-code paste remains available as a fallback.
3. Generate a WebRTC answer locally and show both a segmented QR and copyable reply code.
4. Return the answer to the receiver.
5. Once the DataChannels are connected, press **Start sensor**. Permission requests must happen from this explicit user gesture.
6. Stream motion samples until **Stop sending** is pressed or the connection closes.

## 4. WebRTC design

- Create `RTCPeerConnection` with `iceServers: []`.
- No trickle signaling. Wait for ICE gathering to reach `complete` before serialization. A 15-second guard rejects and discards the attempt instead of emitting incomplete SDP; retry always starts with a fresh `RTCPeerConnection`.
- Pairing diagnostics show ICE gathering state, sanitized local/remote candidate classes (protocol/type/mDNS-vs-IP-family), ICE/peer connection states, and the selected candidate pair when available. Candidate addresses are not shown.
- Superseded/closed sensor attempts are identity-guarded so late connection/data-channel events from an older peer cannot modify the current attempt.
- The receiver creates one independent `RTCPeerConnection` per phone, with a maximum of four simultaneous sensor peers. A failed/disconnected phone must not stop the other peers.
- A terminal `failed` peer is removed and its 1–4 sensor slot becomes reusable. A transient WebRTC `disconnected` state is treated as recoverable until the connection returns to `connected` or becomes `failed`.
- Each peer uses two DataChannels:
  - `sensor`: `ordered: false`, `maxRetransmits: 0`. Fresh data is more important than delayed retransmission.
  - `control`: reliable and ordered. Used for hello metadata, RTT measurement, and four-timestamp clock synchronization.
- The primary target is devices on the same Wi-Fi / LAN.
- Client-isolating networks, many guest Wi-Fi networks, separate NATs, VPN boundaries, and networks that block peer-to-peer traffic may fail. This is an intentional consequence of the no-server requirement.

## 5. Signaling code format

- Schema prefix: `ws1`.
- JSON payload: `{ "v": 1, "type": "offer|answer", "sdp": "..." }`.
- Prefer browser-native `CompressionStream('gzip')` when available; otherwise use plain UTF-8 JSON.
- Base64url encode the bytes.
- Prefix compressed data with `ws1.g.` and uncompressed data with `ws1.j.`.
- Never persist connection codes to localStorage.

## 6. Sensor data

Use `devicemotion` and `deviceorientation` as the v1.0 baseline.

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
- High precision: send each received motion event with higher battery and CPU load.

These are throttling targets, not promises of exact sensor sampling rates. The receiver shows the measured rate.

## 7. Receiver visualization

- Show a roster for all connected sensors with a stable session name (`Sensor 1`…`Sensor 4`), platform/device label, measured sample rate, RTT, and selection state.
- Selecting a sensor drives the live numeric values, CSS 3D phone preview, RTT/sample-rate chips, and pose-zero action.
- Live numeric values cover acceleration, derived acceleration magnitude, rotation rate, and orientation.
- Measurement modes: Motion / Vibration / Tilt / Rotation / Free view.
- Display modes: preserve selected-sensor detail/overlay views and add a stacked comparison view that renders the same signal in a separate vertically arranged chart for each connected phone.
- Impact analysis: configurable automatic threshold detection on gravity-free acceleration, synchronized grouping across phones, per-phone arrival-time deltas, and chart markers.
- FFT analysis: local recent-window frequency analysis using timestamp resampling, Hann windowing, radix-2 FFT, and automatic strongest-axis selection.
- Free view keeps the acceleration / rotation / orientation chart tabs; task-focused modes select an appropriate chart automatically.
- Vibration mode calculates rolling 2-second RMS, peak, and range from gravity-free acceleration magnitude when available.
- Tilt mode focuses on pitch/roll and combined tilt; Rotation mode adds combined rotation magnitude statistics.
- Chart scope: selected sensor or all-sensor overlay. In overlay mode, sensor identity is represented by color and axis identity by line pattern.
- Rolling windows: 5 / 10 / 30 / 60 seconds.
- Autoscale acceleration and rotation charts with sensible minimum ranges.
- **Set current pose to zero** applies only to the selected sensor and affects display/chart values without mutating raw recorded samples.

## 8. Recording and export

- Recording happens only on the receiver.
- One recording session captures every connected sensor; phones added while recording join the same session.
- The reliable control channel exchanges NTP-like four-timestamp ping/pong samples. Connection-time bursts establish the initial mapping, periodic bursts refresh it, and low-RTT samples are weighted more heavily.
- Each receiver peer maintains a bounded linear clock model `receiverTime = slope * sensorTime + intercept`, plus offset, drift (ppm), minimum RTT, uncertainty, and quality.
- Once a clock model is ready, shared timestamps and charts use the corrected sensor-side `performance.now()` value. Packet receive time remains available as a diagnostic/fallback.
- Each sensor also records its own `sensor_elapsed_ms` relative to the first packet from that sensor during the session.
- Live recordings stay in browser memory until the user explicitly saves CSV, a reloadable session JSON, or an HTML report. Measurement history is not silently persisted to IndexedDB or cloud storage.
- CSV fields include sensor ID/name/device label, measurement mode, synchronized elapsed time, receive elapsed time, per-sensor elapsed time, sensor timestamp, synchronized/receive epoch time, sync uncertainty, clock offset/drift, sequence, acceleration, vibration value, gravity-included acceleration, rotation rate/magnitude, orientation, absolute flag, and browser-reported interval.
- Session JSON format `browser-kitty-wireless-sensor-v8` contains sensor metadata (including names, XYZ positions, per-sensor zero offsets and final clock model), connection/privacy metadata, synchronization method metadata, experiment preset, manual markers, impact events, and raw/corrected samples. The app can reopen formats v4 through v8.
- When a recording stops, a receiver-only post-analysis view is derived from the in-memory samples and events. It does not change raw samples or require a network request.
- Post-analysis shows recording-level KPIs, per-sensor vibration peak/RMS and FFT summary, grouped impact-event timing, and event-centered zoomed waveforms.
- Whole-recording FFT searches for the strongest approximately four-second vibration window per sensor before reusing the existing resampling/Hann/radix-2 FFT pipeline.
- Starting a new recording clears the previous post-analysis view because the underlying in-memory recording is replaced.
- The output filename is editable before export.
- Invalid filename characters are sanitized and empty names fall back to `wireless-sensor`.
- CSV uses UTF-8 with BOM for spreadsheet compatibility.
- Clock synchronization is best-effort browser timing, not scientific PTP/GNSS-grade synchronization.

## 9. Experiment presets

- Receiver UI provides eight presets: Impact propagation, Vibration comparison, Tilt comparison, Rotation comparison, Car / bicycle, Elevator, Washer / motor, and Free measurement.
- A preset is guidance plus configuration, not a different sensor protocol.
- Non-free presets can set measurement mode, display layout, chart window, impact detection/threshold, and a recommended application-level phone send rate.
- Recommended send rate is sent over the existing reliable control DataChannel using `set-rate`; the sensor updates its 10 / 30 / unlimited throttle selection and acknowledges with `rate-applied`.
- A newly connected sensor receives the current preset rate after its control channel opens.
- Preset changes are blocked while recording to keep a session configuration stable. Manual measurement/layout/impact changes return the preset indicator to Free measurement.
- The active preset is saved with recording metadata and export rows.

## 10. QR behavior

- QR generation is an embedded build-time dependency (`qrcode-generator` 1.4.4); there is no runtime CDN.
- Both offer and answer handoffs use segmented QR pages carrying only compact `ws1...` signaling data.
- QR pages are deliberately small enough to stay readable on ordinary phone cameras and low-resolution PC webcams.
- The phone offer scanner prefers the rear camera and collects pages in any order.
- PC answer scanning uses native `BarcodeDetector` only when QR is supported, with embedded `jsQR` as the offline fallback.
- QR generation/decoding is available from `file://` as long as camera access is available in the browser context; manual copy/paste remains the fallback.
- QR failure must never block manual copy/paste signaling.

## 11. Sensor permissions and wake lock

- Sensor permission is requested only from the explicit **Start sensor** action.
- Support `DeviceMotionEvent.requestPermission()` / `DeviceOrientationEvent.requestPermission()` when present.
- If supported, use Screen Wake Lock while streaming and re-acquire when the page becomes visible again.
- Failure to acquire wake lock is non-fatal.

## 12. Data and privacy

- No signaling server.
- No STUN server.
- No TURN server.
- No runtime fetch/XHR/WebSocket/EventSource/sendBeacon.
- CSP includes `connect-src 'none'`.
- WebRTC peer traffic is the only runtime inter-device transport.
- Measurements are not uploaded to Browser Kitty.
- Saved CSV/session JSON/HTML report files are created only after an explicit user action.
- UI preferences and sensor names/XYZ positions may be stored in localStorage on the current browser; raw samples, markers, and connection codes are not silently persisted.

## 13. Reports, markers, sensor layout, and saved sessions

- HTML reports are fully self-contained and generated from current/inported recording data. They include overview metrics, sensor layout, vibration/FFT summaries, impacts, timing differences, markers, and compact inline SVG plots.
- Manual markers are timestamped on the receiver shared timeline and are preserved in session JSON; CSV associates a marker with the nearest sample row for spreadsheet use.
- Each receiver sensor slot can store a custom name and XYZ position in centimeters. These values are copied into recording/session metadata.
- When both sensor positions are known, impact analysis may show straight-line distance and apparent propagation speed. This is a derived estimate, not a calibrated material-wave-speed measurement.
- Session loading is local file input only. v4-v8 session files can restore samples/events/markers/sensor metadata and rebuild post-analysis without WebRTC reconnection.

## 13.1 Connection UX and runtime load

- Receiver role selection automatically starts offer generation; **Add sensor** starts a fresh pairing flow without stopping existing peers.
- Sensor role selection automatically opens the QR camera when media capture is available.
- Pairing UI exposes distinct offer, answer, connection-checking, slow-check, failure, and reconnecting states. User QR transfer itself has no timeout.
- QR scans show per-page progress. Offer pages advance every ~1.8 s and reply pages every ~2.2 s to improve readability on lower-resolution desktop cameras.
- A transient `disconnected` peer remains allocated and is shown as reconnecting. Only terminal `failed` releases the sensor slot.
- Phone transmission profiles are application-level throttles: Power saving ≈10 Hz, Standard ≈30 Hz, High precision = device event rate. They do not control the physical sensor sampling hardware.
- Phone numeric preview is intentionally refreshed much less often than sensor transmission (roughly 1 fps / 4 fps / 6–7 fps by profile). Hidden pages skip preview work.
- If the unreliable sensor DataChannel exceeds 64 KiB buffered data, new sensor samples are dropped rather than queued, protecting latency and memory.
- Screen Wake Lock is user-controllable and persisted locally. Turning it off may allow the OS/browser to suspend sensor events after screen sleep.
- Receiver selected-value DOM refresh is capped around 10 fps; roster refresh is coalesced around 1 Hz; chart rendering targets ~30 fps in normal view and ~15 fps in stacked view. Hidden receiver pages stop chart animation and restart it on visibility return.

## 14. Non-goals for v1.0.0

- Cross-internet/NAT traversal.
- TURN fallback.
- GPS, magnetometer, microphone, camera, or ambient-light sensing.
- Cloud history or synchronization.
- Scientific calibration certification.
- Background operation while the browser/OS suspends the page.
- Browser-specific axis normalization between engines. Mixed-browser comparisons should prefer magnitude-based metrics unless axis direction has been verified.

## 15. UX and accessibility

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

## 16. Browser target

Current stable Chromium, Firefox, and Safari are the intended baseline, but sensor and QR-scanning API availability differs by browser and platform.

- The landing UI and manual signaling flow must work from `file://`.
- Phone sensor permission generally works best from a secure HTTP(S) context.
- QR scanning is the primary signaling UX; manual copy/paste remains available when camera access or decoding is unavailable.

## 17. Acceptance criteria

- Repository follows the Browser Kitty single-HTML template structure.
- `app.config.json` version is `1.0.0`.
- `dependencies.json` pins QR generation to an exact version and records license/homepage.
- `scripts/check-repository.ps1` passes on the supported Windows build environment.
- `build-standalone.ps1` produces readable and self-extracting HTML.
- Generated HTML contains no unresolved build placeholders.
- Runtime CSP retains `connect-src 'none'`.
- Source contains no configured STUN/TURN endpoint and creates WebRTC peers with an empty ICE server list.
- Receiver can create a signaling code without any network API.
- Sensor can consume an offer and produce an answer without any network API.
- Receiver can consume the answer and open the two DataChannels when the local network permits P2P traffic.
- Receiver can retain existing connections while pairing additional phones, up to four simultaneous sensors.
- Disconnecting one phone does not terminate the other peer connections.
- Sensor values can stream through each unreliable sensor channel.
- Control-channel ping/pong reports RTT independently for each phone and exchanges sender/receiver monotonic timestamps for clock synchronization.
- Connection-time bursts establish the initial offset model; periodic bursts refresh offset/drift estimates.
- The receiver exposes synchronization uncertainty and uses the corrected sender timeline for multi-sensor comparison when a model is ready.
- Live values update for the selected sensor without rebuilding the full DOM per sample, and the chart can overlay all connected sensors.
- One recording session can capture interleaved samples from multiple sensors on the corrected shared timeline and export user-named CSV and JSON. Receive-time fields remain available as diagnostics/fallback.
- Stopping a non-empty recording automatically reveals a post-analysis view with per-sensor summaries, grouped impact timing, zoomed event waveforms, and whole-recording frequency analysis.
- Measurement modes include Motion, Vibration, Tilt, Rotation, and Free view, with mode-specific summary metrics and chart focus.
- Impact detection groups synchronized events from different phones and reports relative arrival time without requiring a server.
- FFT identifies a known synthetic dominant frequency within one FFT bin/resolution under regular mock sampling.
- Stacked comparison keeps one vertically arranged chart per connected phone and does not remove the existing per-sensor selection UI.
- Standalone HTML reports can be generated after recording or from a reloaded session without a network request.
- Manual markers are recorded on the common receiver timeline and survive session save/reload.
- Sensor names/XYZ positions survive a recording and are included in analysis/session/report output.
- Session JSON format v8 can be reloaded; formats v4-v8 remain accepted for backwards compatibility.
- Japanese and English fit at 360px width.

## 18. Known v1.0 limitations

The most important limitation is deliberate: **a fully serverless WebRTC connection cannot rely on signaling, STUN, or TURN infrastructure.** Wireless Sensor therefore prioritizes same-LAN use and transparent failure over universal connectivity.
