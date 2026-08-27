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
                                      Set remote offer
                                      Create answer
                                             |
  +-- segmented reply QR / copy code <-------+
  |
Set remote answer
  |
  +========= WebRTC DataChannels ===========+
       sensor: unordered, no retransmit
       control: ordered, reliable
```

Pairing another phone creates another `RTCPeerConnection`; it does not replace existing connected peers.

## Network model

Every peer connection is constructed with:

```js
new RTCPeerConnection({ iceServers: [] })
```

No signaling server, STUN, TURN, WebSocket, or external API is configured. ICE gathering is completed locally before the full SDP description is encoded into the handoff code.

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

Recording is receiver-only and memory-only.

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

CSV also records synchronization uncertainty, offset, drift, measurement mode, vibration value, and raw sensor fields. JSON format `browser-kitty-wireless-sensor-v3` stores the final clock model for each sensor so corrected timestamps remain auditable.

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
