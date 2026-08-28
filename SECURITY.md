# Security Policy

## Runtime privacy model

Wireless Sensor is designed without an application backend.

- No signaling server
- No STUN server
- No TURN server
- No analytics or telemetry
- No external API
- No WebSocket
- No cloud persistence
- CSP keeps `connect-src 'none'`

WebRTC offer/answer metadata is handed directly between devices by QR or copy/paste. After negotiation, sensor data travels to the selected peer over WebRTC DataChannel.

Raw measurement samples and markers are held in receiver memory until the user explicitly saves CSV, a Wireless Sensor session JSON, or a standalone HTML report. UI preferences and sensor names/XYZ positions may be stored in this browser’s localStorage; raw samples, markers, and connection codes are not persisted there.

## Threat model notes

A user should treat a connection code as temporary connection metadata and share it only with the intended peer. Wireless Sensor does not authenticate a human identity, provide accounts, or provide a trust directory.

Imported session files are treated as untrusted input: sensor IDs/counts are validated, rendered text is escaped, sensor colors are restricted to hex colors, generated reports use a restrictive CSP, and user-controlled CSV text is protected from spreadsheet formula interpretation.

The application deliberately does not add a signaling service or relay to improve connectivity because that would violate the fully serverless product requirement.

## Reporting a vulnerability

Please report security issues through the repository's normal private security-reporting channel when available. Avoid posting sensitive exploit details in a public issue before a fix can be prepared.
