<<<<<<< HEAD
# MQTT Publisher App

A full-featured web-based MQTT publisher. Connect to any broker, configure QoS, retain, LWT, authentication, payload format/encoding, and stream device telemetry continuously.

Default broker: `10.127.126.157:1883` (update in the UI for your environment).

---

## Requirements

- **Node.js 20+**
- **npm**

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Start the app (UI + MQTT API in one process)
npm run dev

# 3. Open in browser
http://localhost:5173
```

### Usage flow

1. Set **Broker Host** and **Port** (default: `10.127.126.157` / `1883`)
2. Configure **Auth**, **MQTT Version**, **Clean Session**, **LWT** if needed
3. Set **Topic**, **Payload**, **QoS**, **Retain**, **Encoding**
4. Click **Connect**
5. Click **Publish Once** or **Start Streaming**

---

## Production (Local)

```bash
npm install
npm run build
npm start
```

Open **http://localhost:8080**

The production server serves the built UI and `/api/*` MQTT backend on a single port (`8080` by default, or `PORT` env var).

Health check: `GET /api/health`

---

## Features

### Broker Connection

| Setting | Options |
|---------|---------|
| Broker Host / Port | Any MQTT broker |
| Client ID | Custom |
| MQTT Version | 3.1, 3.1.1, 5.0 |
| Clean Session | On / Off |
| TLS | mqtts (auto-switches port to 8883) |

### Authentication

| Mode | Description |
|------|-------------|
| None | Anonymous |
| Username / Password | Standard MQTT auth |
| Certificate | TLS client cert (PEM) |
| Both | Username + certificate |

Certificate fields: CA cert, client certificate, client private key (paste PEM content).

### Last Will & Testament (LWT)

- Enable/disable before connecting
- LWT topic, message, QoS, retain

### Topic & Payload

| Setting | Options |
|---------|---------|
| Topic | Editable anytime (even while streaming) |
| QoS | 0, 1, 2 |
| Retain | On / Off |
| Interval | Milliseconds between stream messages |
| Payload Source | Manual, Auto-generated, Template with variables |
| Serialization | JSON, XML, CSV, Plain Text, YAML, Hex, Custom |
| Encoding | UTF-8, UTF-16, Base64, Binary (hex) |

### Device Info (for auto-generated payloads)

- Device ID, Device Name, Shopfloor, Pillar No, Address/Zone

### Payload modes

**Manual** — type the exact JSON/text to publish. Click **Load sample payload** to reset to the default device schema.

**Auto-generated** — builds live payloads with random sensor values (temperature, humidity, speed, current, vibration) and a fresh timestamp.

**Template** — use variables: `{{timestamp}}`, `{{counter}}`, `{{value}}`, `{{temperature}}`, `{{humidity}}`, `{{speed}}`, `{{current}}`, `{{vibration}}`, `{{deviceId}}`, etc.

---

## Sample Payload Format

```json
{
  "device": {
    "id": "device-nishkarsh-1",
    "name": "Machine A",
    "location": {
      "shopfloor": "Floor 1",
      "pillarNo": 12,
      "address": "Zone A"
    }
  },
  "measurements": [
    {
      "timestamp": "2026-07-14T16:07:49.326937+00:00",
      "sensors": [
        { "type": "temperature", "value": 31.45, "unit": "C" },
        { "type": "humidity", "value": 43.14, "unit": "%" },
        { "type": "speed", "value": 1287.66, "unit": "rpm" },
        { "type": "current", "value": 18.01, "unit": "A" },
        { "type": "vibration", "value": 4.69, "unit": "mm/s" }
      ]
    }
  ]
}
```

---

## Connecting to a VM / Remote Broker

Your PC connects to the broker over the network — not via localhost on the VM.

```
Your PC (localhost:5173)  →  VM Broker (10.127.126.157:1883)
```

### Verify connectivity (PowerShell)

```powershell
Test-NetConnection -ComputerName 10.127.126.157 -Port 1883
```

`TcpTestSucceeded : True` means the broker is reachable.

### If connection fails

| Check | Action |
|-------|--------|
| VM network | Broker IP must be routable from your PC (same LAN/VPN) |
| Broker running | Confirm Mosquitto/EMQX is running on the VM |
| Listen address | Broker must listen on `0.0.0.0:1883`, not only `127.0.0.1` |
| Firewall | Allow inbound TCP 1883 on the VM |
| Auth | Enter username/password in the app if required |

### Mosquitto example (on VM)

```conf
listener 1883 0.0.0.0
allow_anonymous true
```

```bash
sudo systemctl restart mosquitto
```

---

## Public Hosting

The app can be deployed so anyone can use it from a public URL. Users connect to **their own** MQTT brokers from the hosted UI.

### Option 1: Render (easiest, free tier)

1. Push this project to **GitHub**
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect your repo (uses `render.yaml` automatically)
4. Deploy — you get a URL like `https://mqtt-publisher-xxxx.onrender.com`

### Option 2: Docker

```bash
docker build -t mqtt-publisher .
docker run -p 8080:8080 mqtt-publisher
```

Works on Railway, Fly.io, AWS, Azure, GCP, or any Docker host.

### Option 3: VPS (Linux/Windows server)

```bash
npm install
npm run build
npm start
```

Runs on port **8080**. Put nginx or Caddy in front for HTTPS:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Use [Let's Encrypt](https://letsencrypt.org/) for free HTTPS certificates.

### Public hosting notes

| Note | Detail |
|------|--------|
| Private brokers | IPs like `10.127.126.157` only work on your LAN/VPN — not from the public internet |
| Public test brokers | For demos use `broker.emqx.io:1883` or `test.mosquitto.org:1883` |
| Security | Anyone can publish to any broker they specify — add app-level auth if you need to restrict access |
| HTTPS | Use Render/Docker platforms with built-in HTTPS, or nginx + Let's Encrypt on a VPS |

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development mode (UI + API on port 5173) |
| `npm run build` | Build production frontend to `dist/` |
| `npm start` | Production server (UI + API on port 8080) |
| `npm run server` | API-only server on port 3001 (optional) |
| `npm run lint` | Run linter |

---

## Project Structure

```
publisher-app/
├── server/
│   ├── createApp.js      # Express + MQTT API routes
│   ├── payloadUtils.js   # Payload formatting & encoding
│   ├── production.js     # Production server (UI + API)
│   └── index.js          # API-only server (dev)
├── src/
│   ├── App.tsx           # Main UI
│   ├── hooks/            # React hooks (MQTT publisher)
│   ├── utils/            # Payload preview helpers
│   └── types.ts          # TypeScript types & defaults
├── Dockerfile            # Container deploy
├── render.yaml           # Render.com blueprint
└── vite.config.ts        # Vite dev config (embeds API)
```

---

## Troubleshooting

### "Request timed out" or backend not reachable

- Use **`npm run dev`** for local development (single command, no separate server needed)
- For production, run **`npm run build`** then **`npm start`**

### Topic or payload keeps resetting

- Fixed in current version — polling no longer overwrites your edits
- Changes sync to the server automatically and apply on the next publish

### Payload editor not visible

- Set **Payload Source** to **Manual — type your payload**
- Or click **Load sample payload**

### Connect hangs on "Connecting..."

- Confirm broker is reachable: `Test-NetConnection -ComputerName <host> -Port 1883`
- Check broker IP (e.g. `10.127.126.157`, not reversed octets)
- Ensure the MQTT backend is running (`npm run dev` or `npm start`)

---

## License

Private / internal use.
=======
# MQTTPublisher
>>>>>>> 5a152c920f2d93d67b7d28ba16ed4d87599fdc74
