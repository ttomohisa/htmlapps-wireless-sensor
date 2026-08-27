# Wireless Sensor

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-wireless-sensor/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-wireless-sensor/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-wireless-sensor/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML Browser Kitty tool that connects up to four smartphones as wireless motion sensors, streams acceleration, rotation, and orientation directly to a receiver PC over WebRTC, and records them on a shared timeline corrected for the phones’ clock offsets and drift.

## 🚀 Live demo

### [Open Wireless Sensor on GitHub Pages](https://ttomohisa.github.io/htmlapps-wireless-sensor/)

Open the same page on a PC/tablet and a smartphone. GitHub Pages only delivers the app HTML; the WebRTC connection metadata is exchanged directly by QR code or copy/paste, and sensor measurements are sent peer-to-peer. No signaling, STUN, or TURN server is used.

[![Wireless Sensor screenshot](assets/screenshot-en.png)](https://ttomohisa.github.io/htmlapps-wireless-sensor/)

## Features

- **Measure up to four phones at once** — The receiver keeps an independent WebRTC peer connection per phone, so one disconnected sensor does not stop the others.
- **Use a phone as a wireless motion sensor** — Read acceleration, acceleration including gravity, rotation rate, and device orientation from the browser.
- **Connect without a signaling server** — WebRTC peers are created with `iceServers: []`; offer/answer metadata is handed directly between devices.
- **Camera-first QR handoff in both directions** — The PC shows segmented offer QR pages, the phone scans them, then the PC scans the phone's segmented reply QR pages.
- **Designed for ordinary cameras** — QR payloads are split into lower-density pages, the phone prefers its rear camera, and desktop scanning falls back to embedded `jsQR` when native QR decoding is unavailable.
- **Selected and overlay views** — Pick any connected sensor for live values, 3D pose, measured sample rate, and RTT, or overlay all connected sensors on the chart.
- **Clock-corrected synchronized recording** — Connection-time and periodic ping/pong bursts estimate each phone’s offset and drift relative to the PC, favoring low-RTT samples. Per-sensor sync uncertainty is shown in the UI.
- **Measurement modes for common tasks** — Switch between **Motion / Vibration / Tilt / Rotation / Free view**. Vibration mode includes rolling 2-second RMS, peak, and range; rotation mode includes combined rotation metrics.
- **Single HTML, bilingual UI** — Required QR libraries are embedded at build time; Japanese and English are included in the same app.

## Quick start

### Use the web demo

1. Open [Wireless Sensor](https://ttomohisa.github.io/htmlapps-wireless-sensor/) on both devices.
2. Keep both devices on the same Wi-Fi / LAN.
3. On the PC or tablet, choose **View measurements on this device** and press **Create connection info**.
4. On the phone, choose **Use this phone as the sensor**, press **Scan PC QR with camera**, and scan the QR pages shown on the PC.
5. When the phone shows reply QR pages, press **Scan phone reply QR with camera** on the PC and point the phone screen at the PC camera.
6. After the WebRTC connection opens, press **Start sensor** on the phone and grant motion-sensor permission when requested.
7. To add another phone, press **Add sensor** on the receiver and repeat the same QR pairing flow. Up to four phones can remain connected at once.

No installation or account is required. HTTPS hosting is recommended for phone camera and motion-sensor permissions.

### Build a standalone HTML

1. Download or clone this repository.
2. On Windows 10 / 11, double-click `build-standalone.bat`.
3. The first build downloads the exact dependency versions pinned in `dependencies.json`.
4. Open `dist/index.html`, or copy that single file wherever you need it.

Python, Node.js, and a local web server are not required. The builder uses Windows PowerShell and the built-in `tar.exe`.

## Usage

### Receiver: PC / tablet

1. Choose **View measurements on this device**.
2. Press **Create connection info**. Segmented QR pages appear and cycle automatically.
3. Let the phone scan all offer pages. Order does not matter.
4. Press **Scan phone reply QR with camera** and point the phone screen at the PC camera.
5. When all reply pages are collected, the answer is applied automatically and the app waits for the peer connection to open.
6. Use **Add sensor** to repeat the pairing flow while existing sensors remain connected.
7. Select a sensor card to inspect that phone’s live values, 3D pose, measured rate, and RTT.
8. Choose a **Measurement mode**: **Motion / Vibration / Tilt / Rotation / Free view**. The chart focus and summary metrics change with the mode.
9. Switch the chart between **Selected sensor** and **Overlay all sensors** with 5 / 10 / 30 / 60-second windows. Pose zeroing applies only to the selected phone.
10. Clock synchronization runs automatically after connection and periodically afterward. The **Sync** label shows the estimated uncertainty for each phone.
11. Start one recording session to capture all connected sensors on the corrected shared timeline, then export CSV or JSON.

### Sensor: phone

1. Choose **Use this phone as the sensor**.
2. Press **Scan PC QR with camera**. The rear camera is preferred when available.
3. Fill the guide with the QR code. Multiple pages are collected automatically in any order.
4. When all pages are captured, the offer is restored and reply QR pages are generated locally.
5. Show those reply QR pages to the PC camera.
6. After connecting, press **Start sensor** and allow sensor access.
7. Choose **Power saving**, **Standard**, or **High frequency** send rate. These are throttling targets, not guaranteed hardware sampling rates.

Copy/paste connection codes remain available as a fallback if either camera cannot scan QR codes.

## Sensor data

Wireless Sensor uses the browser `devicemotion` and `deviceorientation` events. Recorded data includes:

- acceleration x / y / z
- derived acceleration magnitude `√(x² + y² + z²)`
- acceleration including gravity x / y / z
- rotation rate alpha / beta / gamma
- orientation alpha / beta / gamma
- orientation absolute flag
- browser-reported `DeviceMotionEvent.interval`
- sensor ID / sensor name / device label
- clock-synchronized shared elapsed time for cross-device comparison
- receive-time elapsed value as a diagnostic/fallback
- estimated sync uncertainty, clock offset, and clock drift
- measurement mode, vibration value, and combined rotation magnitude
- per-sensor elapsed time, sensor timestamp, and receive timestamp
- sequence number

Unavailable browser/device values are stored as empty CSV fields or `null` in JSON.

## Publish with GitHub Pages

The repository includes a workflow that builds the embedded standalone HTML and deploys `dist/` to GitHub Pages.

1. Push the repository to GitHub as `htmlapps-wireless-sensor`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run **Deploy standalone app to GitHub Pages** from the Actions tab.
4. After a successful deployment, the app is available at `https://ttomohisa.github.io/htmlapps-wireless-sensor/`.

Each push to `main` rebuilds the app from pinned dependencies, verifies the generated standalone HTML, and then publishes it. The workflow skips deployment with guidance if GitHub Pages has not been enabled yet.

## Development and build layout

```text
.
├─ src/index.template.html       # Application template
├─ app.config.json               # App metadata and version
├─ dependencies.json             # Pinned embedded dependencies
├─ build-standalone.bat          # Windows build entry point
├─ build-standalone.ps1          # Standalone HTML builder
├─ scripts/                      # Repository/build verification
├─ assets/                       # Favicon and README screenshots
├─ dist/                         # Generated deployment artifacts
└─ .github/workflows/
   ├─ build-standalone.yml       # Pull request build validation
   └─ deploy-pages.yml           # Automatic Pages deployment from main
```

### Build and verify

```powershell
.\build-standalone.bat
pwsh -File .\scripts\check-repository.ps1
```

The build process automatically:

- downloads exact npm package versions from `dependencies.json`
- embeds `qrcode-generator` and gzip-compressed `jsQR` into the HTML
- records dependency hashes and build metadata
- rejects unresolved build placeholders
- verifies the runtime network-blocking policy
- produces readable and self-extracting standalone HTML artifacts

Do not edit generated files under `dist/` manually.

## Privacy and runtime network protection

Wireless Sensor deliberately uses no signaling, STUN, or TURN infrastructure.

- WebRTC peers are created with `RTCPeerConnection({ iceServers: [] })`.
- Offer/answer metadata is transferred directly by QR code or copy/paste.
- Sensor measurements travel directly to the connected peer over WebRTC DataChannel.
- Measurements stay in receiver memory until the user explicitly saves CSV or JSON.
- The generated HTML keeps a Content Security Policy with `connect-src 'none'` for normal runtime network APIs.
- The QR generator and decoder are embedded; there is no runtime CDN.

The GitHub Pages version still needs the initial HTML request. For a completely disconnected copy, build and open `dist/index.html`; note that browser camera/sensor permissions can be more restrictive for `file://` pages, so manual connection-code transfer may be required.

## Limitations

- **Same-LAN use is the primary target.** Without STUN/TURN, connections across different networks or NATs are intentionally out of scope.
- Company, school, guest Wi-Fi, VPNs, firewalls, or access points with client isolation can block device-to-device traffic even when both devices appear to be on the same Wi-Fi.
- Browser sensor values are not a substitute for calibrated scientific instruments. Accuracy, available fields, and sample rates vary by device, OS, and browser.
- iPhone/iPad and some browsers require an explicit permission gesture for motion sensors.
- Backgrounding or locking the phone can suspend browser sensor events and stop streaming.
- Long recordings remain in receiver memory until saved. Multi-phone sessions accumulate samples faster, so save in segments when needed.
- Clock synchronization is an NTP-like estimate over the WebRTC DataChannel. It favors low-RTT samples and corrects offset and long-run drift, but cannot guarantee asymmetric network delay or OS/browser timer behavior. It is not a replacement for PTP/GNSS-grade scientific synchronization.
- v0.11.0 supports up to four simultaneous phones. GPS, magnetometer, microphone sensing, and camera sensing beyond QR setup remain out of scope.

## Dependencies

| Library | Version | License | Purpose |
| --- | ---: | --- | --- |
| qrcode-generator | 1.4.4 | MIT | Generate segmented offer/answer QR codes |
| jsQR | 1.4.0 | Apache-2.0 | Offline QR decoding fallback, especially on desktop |

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
