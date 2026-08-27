# Architecture — Wireless Sensor

## Overview

Wireless Sensor is built from one source HTML template and produces self-contained release HTML files. Runtime data transport is WebRTC peer-to-peer; there is no application backend.

```text
Receiver browser                         Sensor browser
----------------                         --------------
Create offer
  |                                          ^
  +-- QR / copy connection code ------------+
                                             |
                                      Set remote offer
                                      Create answer
                                             |
  +-- QR / copy reply code <----------------+
  |
Set remote answer
  |
  +========= WebRTC DataChannels ===========+
       sensor: unordered, no retransmit
       control: ordered, reliable
```

## Network model

The peer connection is constructed with:

```js
new RTCPeerConnection({ iceServers: [] })
```

No signaling server, STUN, TURN, WebSocket, or external API is configured. ICE gathering is completed locally before the full SDP description is encoded into the handoff code.

This makes same-LAN connectivity the intended v1 environment and deliberately gives up universal NAT traversal.

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

## DataChannels

### `sensor`

- unordered
- `maxRetransmits: 0`
- JSON samples
- stale samples are intentionally not retransmitted

### `control`

- reliable / ordered defaults
- hello metadata
- ping / pong RTT measurement

## Sensor adapter

v1 reads:

- `devicemotion`
- `deviceorientation`

The sender keeps the latest orientation event and combines it with each transmitted motion event. Missing browser values remain `null`.

Send rate is implemented as application-level throttling; the app does not claim to control the physical sensor frequency.

## Receiver rendering

High-frequency updates avoid rebuilding large DOM sections. The receiver updates fixed numeric nodes, pushes samples into a rolling in-memory history, and redraws a single canvas chart with `requestAnimationFrame`.

The CSS 3D phone is a visual orientation aid, not a calibrated 3D reference model.

## Recording

Recording is receiver-only and memory-only. Raw samples are retained until the user stops and saves CSV or JSON. v1 deliberately avoids IndexedDB and persistent history.

Zeroing affects displayed orientation and chart transforms, while export retains raw orientation plus zero-offset metadata.

## Embedded QR dependency

`qrcode-generator` is pinned in `dependencies.json` and embedded into the standalone HTML by the build pipeline. It is loaded at runtime from an in-memory Blob URL produced from the embedded bytes, not from the network.

## CSP

The template's restrictive CSP is retained, including:

```text
connect-src 'none'
```

No fetch/XHR/WebSocket/API path is required by the application.
