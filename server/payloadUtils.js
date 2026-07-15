export const SAMPLE_DEVICE_PAYLOAD = `{
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
}`;

function randomInRange(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

export function buildDevicePayload(deviceSettings) {
  const timestamp = new Date().toISOString();

  return {
    device: {
      id: deviceSettings.deviceId,
      name: deviceSettings.deviceName,
      location: {
        shopfloor: deviceSettings.shopfloor,
        pillarNo: Number(deviceSettings.pillarNo),
        address: deviceSettings.address,
      },
    },
    measurements: [
      {
        timestamp,
        sensors: [
          { type: 'temperature', value: randomInRange(18, 40, 2), unit: 'C' },
          { type: 'humidity', value: randomInRange(30, 90, 2), unit: '%' },
          { type: 'speed', value: randomInRange(800, 1500, 2), unit: 'rpm' },
          { type: 'current', value: randomInRange(5, 25, 2), unit: 'A' },
          { type: 'vibration', value: randomInRange(1, 10, 2), unit: 'mm/s' },
        ],
      },
    ],
  };
}

export function createPayloadContext(counter, deviceSettings) {
  const payload = buildDevicePayload(deviceSettings);
  const sensors = payload.measurements[0].sensors;

  return {
    counter,
    timestamp: payload.measurements[0].timestamp,
    deviceId: deviceSettings.deviceId,
    deviceName: deviceSettings.deviceName,
    shopfloor: deviceSettings.shopfloor,
    pillarNo: deviceSettings.pillarNo,
    address: deviceSettings.address,
    temperature: sensors.find((s) => s.type === 'temperature')?.value ?? 0,
    humidity: sensors.find((s) => s.type === 'humidity')?.value ?? 0,
    speed: sensors.find((s) => s.type === 'speed')?.value ?? 0,
    current: sensors.find((s) => s.type === 'current')?.value ?? 0,
    vibration: sensors.find((s) => s.type === 'vibration')?.value ?? 0,
  };
}

function applyTemplate(template, context) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

export function formatPayload(format, customPayload, counter, deviceSettings) {
  const context = createPayloadContext(counter, deviceSettings);
  const devicePayload = buildDevicePayload(deviceSettings);

  switch (format) {
    case 'json':
      return JSON.stringify(devicePayload, null, 2);

    case 'xml':
      return `<?xml version="1.0" encoding="UTF-8"?>
<device id="${deviceSettings.deviceId}" name="${deviceSettings.deviceName}">
  <location shopfloor="${deviceSettings.shopfloor}" pillarNo="${deviceSettings.pillarNo}" address="${deviceSettings.address}"/>
  <measurement timestamp="${context.timestamp}">
    <sensor type="temperature" value="${context.temperature}" unit="C"/>
    <sensor type="humidity" value="${context.humidity}" unit="%"/>
    <sensor type="speed" value="${context.speed}" unit="rpm"/>
    <sensor type="current" value="${context.current}" unit="A"/>
    <sensor type="vibration" value="${context.vibration}" unit="mm/s"/>
  </measurement>
</device>`;

    case 'csv':
      return `${context.timestamp},${context.deviceId},${context.temperature},${context.humidity},${context.speed},${context.current},${context.vibration}`;

    case 'text':
      return `device=${context.deviceId} timestamp=${context.timestamp} temp=${context.temperature}C humidity=${context.humidity}% speed=${context.speed}rpm current=${context.current}A vibration=${context.vibration}mm/s`;

    case 'yaml':
      return [
        `device:`,
        `  id: ${context.deviceId}`,
        `  name: ${context.deviceName}`,
        `timestamp: ${context.timestamp}`,
        `temperature: ${context.temperature}`,
        `humidity: ${context.humidity}`,
        `speed: ${context.speed}`,
        `current: ${context.current}`,
        `vibration: ${context.vibration}`,
      ].join('\n');

    case 'hex':
      return Buffer.from(JSON.stringify(devicePayload)).toString('hex');

    case 'custom':
      return applyTemplate(customPayload, context);

    default:
      return JSON.stringify(devicePayload, null, 2);
  }
}

export function resolvePayloadText(settings, counter) {
  if (settings.payloadMode === 'static') {
    if (settings.payloadFormat === 'custom') {
      return applyTemplate(settings.staticPayload, createPayloadContext(counter, settings));
    }
    return settings.staticPayload;
  }

  return formatPayload(settings.payloadFormat, settings.customPayload, counter, settings);
}

export function encodePayload(text, encoding) {
  switch (encoding) {
    case 'utf8':
      return { buffer: Buffer.from(text, 'utf8'), preview: text };
    case 'utf16':
      return { buffer: Buffer.from(text, 'utf16le'), preview: Buffer.from(text, 'utf16le').toString('hex') };
    case 'base64': {
      const b64 = Buffer.from(text, 'utf8').toString('base64');
      return { buffer: Buffer.from(b64, 'utf8'), preview: b64 };
    }
    case 'binary': {
      const hex = text.replace(/\s+/g, '');
      if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
        const buffer = Buffer.from(hex, 'hex');
        return { buffer, preview: buffer.toString('hex') };
      }
      return { buffer: Buffer.from(text, 'binary'), preview: Buffer.from(text, 'binary').toString('hex') };
    }
    default:
      return { buffer: Buffer.from(text, 'utf8'), preview: text };
  }
}

export function buildPublishPayload(settings, counter) {
  const text = resolvePayloadText(settings, counter);
  const encoded = encodePayload(text, settings.payloadEncoding);

  return {
    text,
    wirePayload: encoded.buffer,
    encodedPreview: encoded.preview,
  };
}

export function getPayloadPreview(settings) {
  const { text, encodedPreview } = buildPublishPayload(settings, 1);
  if (settings.payloadEncoding === 'utf8') {
    return text;
  }
  return `--- Raw ---\n${text}\n\n--- Encoded (${settings.payloadEncoding}) ---\n${encodedPreview}`;
}
