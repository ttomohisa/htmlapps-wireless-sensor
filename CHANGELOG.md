# Changelog

## 1.0.0 - 2026-08-28

- Promoted Wireless Sensor to the first stable release after the v0.9-v0.19 public test cycle.
- Completed a release-wide consistency review across pairing, synchronized multi-sensor recording, experiment presets, impact/FFT analysis, reports, markers, sensor layout, session restore, and power/load controls.
- Fixed the English phone-reply QR guidance so it matches the camera-first pairing flow.
- Localized all generated HTML report table headers in Japanese and English.
- Hardened imported session metadata by validating sensor count/IDs and sanitizing sensor colors before rendering or report generation.
- Added a restrictive CSP to generated standalone HTML reports and protected user-controlled CSV text fields from spreadsheet formula interpretation.
- Clarified localStorage usage and mixed-browser DeviceMotion axis limitations in the UI/spec/docs.
- Updated GitHub Actions checkout to v7 for the stable release workflow.
- Aligned the final pairing guidance and Windows verification command with the camera-first flow and built-in Windows PowerShell.

## 0.19.0 - 2026-08-28

- Polished pairing UX: receiver selection now creates the offer QR automatically, phone-sensor selection opens the QR scanner automatically, and adding another sensor starts pairing immediately while existing peers stay connected.
- Added stage-specific pairing guidance for offer scan, reply scan, connection checking, slow connection checks, failures, and transient reconnects; QR handoff remains free of a user-transfer timeout.
- Added segmented QR scan progress bars and slowed automatic QR page changes, especially for phone-to-PC reply scanning on lower-resolution desktop cameras.
- Added recoverable connection-health UI so transient WebRTC `disconnected` states show as reconnecting before a terminal `failed` state removes the peer.
- Added phone-side battery/load controls with Power saving / Standard / High precision profiles, optional Screen Wake Lock, actual send/UI refresh statistics, and DataChannel backpressure protection.
- Reduced phone DOM updates to profile-dependent low rates while preserving transmitted sensor samples.
- Reduced receiver UI work by throttling selected-sensor DOM refreshes, coalescing roster updates, avoiding repeated layout/legend rebuilds, and capping chart rendering to about 30 fps normally and 15 fps in stacked comparison mode.
- Pause receiver chart rendering while the page is hidden and resynchronize/restart drawing when it becomes visible again.
- Kept session format v8 unchanged because the optimization metadata is runtime-only and does not change recorded measurement semantics.

## 0.18.0 - 2026-08-28

- Promoted JSON export to a reloadable Wireless Sensor measurement-session format: `browser-kitty-wireless-sensor-v8`.
- Added **Open past recording** on the home/receiver flows so saved sessions can be analyzed without reconnecting phones.
- Added backwards loading support for Wireless Sensor session formats v4 through v8.
- Restored recorded samples, impacts, markers, sensor metadata/positions, experiment preset, measurement mode, and timing metadata from loaded sessions.
- Rebuild post-recording analysis and standalone HTML reports locally from an imported session.

## 0.17.0 - 2026-08-28

- Added receiver-side sensor names and XYZ positions in centimeters for each sensor slot.
- Persisted sensor layout metadata locally on the receiver and included it in recordings, CSV/session export, analysis, and reports. JSON recording format is now `browser-kitty-wireless-sensor-v7`.
- Added straight-line sensor distance to impact details when both sensor positions are available.
- Added apparent propagation-speed estimates from known sensor distance and synchronized impact arrival-time differences.

## 0.16.0 - 2026-08-28

- Added timestamped manual markers/notes during recording, such as Motor ON, Brake, or Tapped desk.
- Added markers to post-recording analysis and standalone reports.
- Added markers to session JSON and attached each marker to the nearest sample row in CSV export. JSON recording format is now `browser-kitty-wireless-sensor-v6`.
- Kept markers on the receiver's shared synchronized timeline so they can be compared with every connected phone.

## 0.15.0 - 2026-08-28

- Added a self-contained HTML measurement report generated entirely in the browser.
- Added recording overview, per-sensor vibration/RMS/frequency summaries, impact timing, and compact vibration plots to reports.
- Kept reports standalone with inline CSS/SVG and no runtime network dependencies.

## 0.14.0 - 2026-08-28

- Added eight experiment presets: Impact propagation, Vibration comparison, Tilt comparison, Rotation comparison, Car / bicycle, Elevator, Washer / motor, and Free measurement.
- Added preset-specific setup instructions and recommended display/measurement settings directly in the receiver UI.
- Presets automatically configure measurement mode, stacked/per-device layout, chart window, impact detection, and threshold where appropriate.
- Added receiver-to-sensor control messages that change the application-level send rate on already-connected phones and automatically apply the same recommendation to phones connected later.
- Blocked preset switching while a recording is active so one experiment session keeps a consistent preset configuration.
- Added the selected experiment preset to recorded sensor metadata, CSV rows, and JSON export. JSON recording format is now `browser-kitty-wireless-sensor-v5`.
- Kept Free measurement non-destructive so existing manual settings can continue to be combined without forcing a new configuration.

## 0.13.0 - 2026-08-28

- Added a post-recording analysis view that opens automatically when a recording stops.
- Added recording-level summary metrics for duration, sensor count, sample count, impact groups, maximum impact, and synchronization uncertainty.
- Added per-sensor result cards with vibration peak, vibration RMS, dominant frequency, sample count, and final sync uncertainty.
- Added a recorded impact-event browser with grouped cross-device arrival timing, per-device peak/sync details, and selectable events.
- Added synchronized zoomed vibration waveforms around each selected impact using a shared time origin and shared vertical scale across participating sensors.
- Added whole-recording FFT analysis that searches each sensor recording for its strongest roughly four-second vibration window before calculating dominant and secondary frequency peaks.
- Kept CSV/JSON export format compatible with v0.12.0; the analysis view is derived locally from the in-memory recording without introducing runtime network access or a new dependency.

## 0.12.0 - 2026-08-28

- Added automatic impact-event detection from gravity-free acceleration with a configurable threshold and hysteresis to avoid repeated triggers.
- Added synchronized cross-device impact grouping so the latest event shows per-phone arrival-time differences and sync uncertainty.
- Added impact markers to live time-series charts and preserved detected events in the v4 JSON recording format.
- Added local FFT vibration analysis over the selected sensor's recent samples. The analyzer resamples irregular timestamps, applies a Hann window, and automatically chooses the acceleration axis with the strongest variation to avoid magnitude-only frequency doubling.
- Added dominant frequency, secondary peak, and frequency-resolution readouts without introducing a new dependency.
- Added a stacked comparison view that keeps the existing per-sensor selection UI while placing the same signal in one chart per connected phone vertically.
- Kept the existing selected-sensor detail view and all-sensor overlay chart as alternatives.

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
