# Architecture — Wireless Sensor

## Overview

Wireless Sensor is built from one source HTML template and produces self-contained release HTML files. Runtime transport is WebRTC peer-to-peer; there is no application backend.

The receiver can keep up to four independent smartphone peer connections active at the same time.

```text
                         Receiver browser
                    ┌────────────────────────┐
Phone A browser ────┤ Peer A                 │
                    │  sensor DataChannel    │
Phone B browser ────┤ Peer B                 │
                    │  control DataChannel   │
Phone C browser ────┤ Peer C                 │
                    │                        │
Phone D browser ────┤ Peer D                 │
                    └────────────────────────┘
                         │
                         ├─ selected-sensor detail view
                         ├─ all-sensor overlay chart
                         ├─ same-signal stacked charts
                         ├─ impact timing + FFT analysis
                         └─ synchronized receiver-side recording
```

Each phone is paired separately:

```text
Receiver browser                         Sensor browser
----------------                         --------------
Create offer
  |                                          ^
  +-- segmented QR / copy code --------------+
                                             |
                                      Store remote offer
                                             |
                       Receiver opens reply scanner first
                                             |
                                      Create fresh answer
                                      after user confirms
                                             |
  +-- segmented reply QR / copy code <-------+
  |          (auto-regenerate before connection if ICE fails)
Set remote answer
  |
  +========= WebRTC DataChannels ===========+
       sensor: unordered, no retransmit
       control: ordered, reliable
                (sync + preset send-rate control)
```

Pairing another phone creates another `RTCPeerConnection`; it does not replace existing connected peers. On the phone, reading an offer does not immediately create a peer connection. The offer is held locally until the receiver reply scanner is ready. If the phone reaches pre-connection ICE `failed`, the phone discards that peer and regenerates a fresh answer from the stored offer up to three times.

## Network model

Every peer connection is constructed with:

```js
new RTCPeerConnection({ iceServers: [] })
```

No signaling server, STUN, TURN, WebSocket, or external API is configured. ICE gathering must reach `complete` locally before the full SDP description is encoded into the handoff code. A 15-second safety guard aborts the attempt rather than serializing incomplete SDP; retries allocate a fresh peer connection.

This makes same-LAN connectivity the intended environment and deliberately gives up universal NAT traversal. A failed peer must not stop the other connected phones.
Terminal `failed` peers are closed and removed so their sensor number/slot can be reused. A transient `disconnected` state is kept in place because WebRTC may recover it without renegotiation.

## Receiver peer state

The receiver stores one state object per smartphone. Important per-peer state includes:

- `RTCPeerConnection`
- sensor/control DataChannels
- connection status
- stable session number and display color
- device/platform label
- latest sample
- rolling chart history
- measured sample interval/rate
- ping/pong RTT state
- independent orientation zero offset

The connected-sensor roster selects which peer drives the detailed numeric values and CSS 3D phone view.

## Experiment presets

Experiment presets live entirely on the receiver and reuse existing measurement/rendering features. A preset can select measurement mode, display layout, chart time window, impact detection/threshold, and a recommended sender throttle. The sender throttle is not a request to the hardware sensor; it only controls how often browser motion events are forwarded.

When a preset recommends 10 Hz, 30 Hz, or unrestricted sending, the receiver sends `set-rate` over each reliable control DataChannel. The phone updates the same radio selection exposed in its UI and returns `rate-applied`. Newly connected phones receive the currently selected preset rate when their control channel opens. No new network path or server is introduced.

Preset switching is disabled while recording so a guided experiment has stable high-level settings. Manual measurement-mode, layout, impact-threshold, or impact-enable edits return the preset indicator to Free measurement. The selected preset is stored in record metadata and exports for reproducibility.

## Signaling serialization

The handoff payload contains only:

- schema version
- SDP type (`offer` or `answer`)
- SDP string

Payloads are UTF-8 JSON. When `CompressionStream('gzip')` exists, gzip is used to reduce QR size. Encoded codes start with:

- `ws1.g.` for gzip
- `ws1.j.` for uncompressed JSON

The remaining bytes are Base64url.

Both offer and answer are split into compact `wsq1...` QR pages. The phone scans the PC offer pages in-app, and the PC scans the phone answer pages. Pages can arrive in any order and are reassembled locally. Manual copy/paste is always retained.

Only one new phone is paired at a time; already-connected peer connections continue streaming during that pairing flow.

## DataChannels

Each phone has two DataChannels.

### `sensor`

- unordered
- `maxRetransmits: 0`
- JSON samples
- stale samples are intentionally not retransmitted

### `control`

- reliable / ordered defaults
- hello metadata
- ping / pong timestamp exchange used for RTT and clock-model estimation
- preset `set-rate` / `rate-applied` messages for application-level sender throttling

## Sensor adapter

The sender reads:

- `devicemotion`
- `deviceorientation`

The sender keeps the latest orientation event and combines it with each transmitted motion event. Missing browser values remain `null`.

Send rate is application-level throttling; the app does not claim to control the physical sensor frequency.

## Receiver rendering

High-frequency updates avoid rebuilding the full application DOM.

- Each peer appends to its own rolling in-memory history.
- The selected peer updates fixed numeric DOM nodes and the CSS 3D phone.
- The roster is refreshed at a throttled rate for sample-rate / RTT summaries.
- One canvas is redrawn with `requestAnimationFrame`.
- In selected mode, axis identity uses the existing X/Y/Z colors.
- In all-sensor overlay mode, sensor identity uses a per-peer color and axis identity uses solid/dashed/dotted line patterns.

The CSS 3D phone is a visual orientation aid, not a calibrated 3D reference model.

## Recording and synchronization

Recording is receiver-only and memory-resident until the user explicitly saves an artifact. Saved session JSON can later be loaded back into receiver memory for offline re-analysis.

Each reliable control channel also carries an NTP-like timestamp exchange. A ping stores receiver time `t1`; the phone returns its receive/send times `t2` / `t3`; the receiver captures return time `t4`. The receiver derives an RTT sample and a correspondence between phone `performance.now()` and receiver `performance.now()`.

At connection time the receiver sends a short synchronization burst. It then repeats smaller bursts periodically and when the receiver tab becomes visible again. Recent low-RTT observations are weighted more heavily. Once observations span enough time, a bounded linear fit estimates both clock offset and long-run drift.

Per-peer clock state contains:

- fitted `receiverTime = slope * sensorTime + intercept` mapping
- current offset estimate
- drift in ppm
- minimum observed RTT
- uncertainty estimate and `good` / `fair` / `poor` quality

Charts use the corrected sender timestamp when a clock model is ready, falling back to packet receipt time while synchronization is still being established.

A recording session stores both timelines:

- `synchronized_elapsed_ms`: sensor timestamp mapped onto receiver time, then measured from the recording start
- `receive_elapsed_ms`: receiver packet-arrival time from the recording start, retained for diagnostics/fallback

CSV also records synchronization uncertainty, offset, drift, measurement mode, vibration value, and raw sensor fields. Session JSON format `browser-kitty-wireless-sensor-v8` stores the final clock model, sensor names/XYZ positions, experiment preset, markers, impacts, and samples so corrected timestamps remain auditable and the session can be reopened. Loaders accept v4-v8.

This is a practical browser-level synchronization scheme, not a guarantee of scientific PTP/GNSS-grade time alignment. Asymmetric network delay and browser/OS scheduling can still bias the estimate.

Zeroing affects displayed orientation and chart transforms only; raw orientation samples remain unchanged.

## Measurement modes

The receiver exposes five measurement modes without changing the raw sensor payload:

- **Motion** — XYZ acceleration, current magnitude, rolling 2-second peak, and measured sample rate.
- **Vibration** — gravity-free acceleration magnitude where available (or a gravity-magnitude fallback), plus rolling 2-second RMS, peak, and range.
- **Tilt** — pitch/roll-focused charting and current combined tilt.
- **Rotation** — alpha/beta/gamma rotation rate with current, peak, and average combined rotation magnitude.
- **Free view** — keeps the original manual acceleration / rotation / orientation chart tabs.

All calculations are local and use the per-peer in-memory rolling history. No additional dependency or network path is introduced.

## Embedded QR dependencies

`qrcode-generator` and `jsQR` are pinned in `dependencies.json` and embedded into the standalone HTML by the build pipeline. They are loaded from in-memory Blob URLs produced from embedded bytes, not from the network.

## CSP

The restrictive CSP is retained, including:

```text
connect-src 'none'
```

No fetch/XHR/WebSocket/API path is required by the application.

## Impact timing

The receiver derives a gravity-free acceleration magnitude from `event.acceleration` when available, with the existing gravity-magnitude fallback otherwise. A configurable threshold plus release hysteresis detects a new impact only on a rising crossing and avoids repeated triggers while the signal remains high.

Each impact is timestamped on the peer's corrected receiver-time mapping. Impacts from different sensor IDs within a short synchronized window are grouped as the same physical event. The UI sorts the grouped events by corrected time and reports deltas from the earliest sensor together with each peer's synchronization uncertainty. The marker time is the threshold crossing; the displayed peak may continue updating for a short window after the crossing.

When recording is active, detected impacts are included in session JSON alongside samples, the active experiment preset, markers, and sensor layout metadata.

## FFT analysis

FFT analysis is local and dependency-free. The selected peer contributes roughly the most recent four seconds of motion history. Because browser sensor timestamps are not perfectly uniform, recent samples are resampled onto an evenly spaced power-of-two timeline spanning the available analysis window. The app chooses the acceleration axis with the largest recent standard deviation, subtracts its mean, applies a Hann window, and runs an in-page radix-2 FFT.

Choosing a signed axis instead of acceleration magnitude avoids the common frequency-doubling artifact that appears when a sinusoidal signal is converted to an absolute magnitude. The UI reports the strongest peak above 0.5 Hz, a separated secondary peak, and the bin resolution. Maximum meaningful frequency remains bounded by the sensor's actual sample rate (Nyquist limit).

## Stacked comparison

The existing connected-sensor roster remains the way to select one peer for detailed values and FFT. A separate display-mode switch can replace the single dashboard with one time-series chart per connected phone, stacked vertically. Every stacked chart uses the same measurement/chart type and time-window setting, so acceleration, vibration, tilt, or rotation can be compared without overlapping lines. Impact markers use the same corrected time base in each chart.

## Post-recording analysis

The receiver derives post-recording analysis entirely from `recordSamples`, `recordEvents`, and `recordSessionSensors` after recording stops. No new network path or persistence layer is introduced.

The analysis pipeline:

1. Recomputes each sample's corrected elapsed time using the final per-sensor clock model.
2. Builds recording-level KPIs and per-sensor vibration peak/RMS summaries.
3. Groups recorded impacts by `groupId` and sorts each group on the synchronized elapsed clock.
4. Draws event-centered vibration windows from -250 ms to +750 ms around the first device arrival, using a shared amplitude scale across participating sensors.
5. Searches each sensor recording for the strongest roughly four-second vibration window and sends that window through the existing irregular-sample resampling, Hann-window, and radix-2 FFT implementation.

The analysis UI is derived from the recording/session model rather than serialized as UI state. Starting a new recording replaces the in-memory recording and hides the previous analysis view. Loading a saved v4-v8 session repopulates the same model and runs the same analysis pipeline without reconnecting sensors.


## Reports and manual markers

Markers are receiver-side events on the same shared timeline used by synchronized sensor samples. A marker contains an ID, elapsed time, optional note, and wall-clock timestamp. Session JSON preserves markers directly; CSV places marker fields on the nearest sample row to keep spreadsheet export flat.

The HTML report generator consumes the current analysis/session model and emits a single self-contained document with inline CSS and SVG. It includes overview metrics, experiment/preset information, sensor names and positions, vibration/RMS/frequency summaries, impact timing, markers, and compact waveform plots. No external script, image, stylesheet, fetch, or API is required by the saved report.

## Sensor layout and propagation estimates

The receiver can assign a custom name and XYZ position in centimeters to each sensor slot. Layout values are stored locally by slot for convenience and are copied into recording metadata so saved sessions remain self-describing.

When two sensors participating in the same grouped impact both have positions, the app calculates Euclidean straight-line distance. If their synchronized arrival delta is positive, it also shows `distance / delta` as an apparent propagation speed. This value is explicitly informational: sensor placement, material paths, threshold crossing, synchronization uncertainty, and browser scheduling all affect it.

## Reloadable measurement sessions

`browser-kitty-wireless-sensor-v8` is the current session schema. The loader also accepts v4, v5, v6, and v7 so recordings from recent pre-v1 releases remain useful. Imported session data stays local, is normalized into the same `recordSamples`, `recordEvents`, `recordMarkers`, and sensor metadata structures used by live recordings, and then feeds the ordinary post-recording analysis/report code paths.

Session loading does not recreate WebRTC peers and does not contact a server. Starting a new live recording replaces the imported in-memory session.
## Pairing state and load control (v1.0)

Pairing remains a manual QR handoff protocol, but the UI starts the obvious next action automatically: receiver selection creates an offer and sensor selection starts camera scanning. The protocol itself stays fully serverless. QR pages expose scan progress and use longer display intervals to favor low-resolution desktop cameras. User QR transfer has no timeout; the only bounded timer is the pre-QR ICE-gathering guard, which discards an incomplete attempt. Diagnostics expose candidate classes and state transitions, while retry cleanup and connection-identity guards prevent late events from superseded peers from affecting a newer attempt.

On the phone, motion events may arrive faster than the chosen application send rate. The sender therefore gates transmission before serialization, refreshes numeric preview independently at a much lower frequency, and checks `RTCDataChannel.bufferedAmount` before sending. When more than 64 KiB is buffered, the newest sample is dropped instead of increasing latency. This is appropriate for real-time sensor streaming where stale samples are less useful than current samples.

Screen Wake Lock is optional. It improves continuity on mobile browsers that suspend sensor events after the display sleeps, but costs battery. The choice is stored only in localStorage and is not part of measurement-session semantics.

The receiver keeps raw sample processing, impact detection, recording, and synchronization at incoming sample rate while throttling presentation work. Selected-value DOM changes are capped around 10 fps, roster metrics are coalesced around 1 Hz, repeated sensor-layout/legend rebuilds are signature-guarded, and chart rendering is capped around 30 fps (normal) or 15 fps (stacked). Chart animation stops while the document is hidden and resumes when visible.

