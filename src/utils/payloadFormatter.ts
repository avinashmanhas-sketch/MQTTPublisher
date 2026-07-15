import type { PayloadFormat, PayloadEncoding, PublisherSettings } from '../types';
import { SAMPLE_DEVICE_PAYLOAD } from '../types';

export interface DeviceSettings {
  deviceId: string;
  deviceName: string;
  shopfloor: string;
  pillarNo: number;
  address: string;
}

export interface PayloadContext {
  counter: number;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  shopfloor: string;
  pillarNo: number;
  address: string;
  temperature: number;
  humidity: number;
  speed: number;
  current: number;
  vibration: number;
}

function randomInRange(min: number, max: number, decimals = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

export function buildDevicePayload(device: DeviceSettings) {
  const timestamp = new Date().toISOString();

  return {
    device: {
      id: device.deviceId,
      name: device.deviceName,
      location: {
        shopfloor: device.shopfloor,
        pillarNo: Number(device.pillarNo),
        address: device.address,
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

export function createPayloadContext(counter: number, device: DeviceSettings): PayloadContext {
  const payload = buildDevicePayload(device);
  const sensors = payload.measurements[0].sensors;

  return {
    counter,
    timestamp: payload.measurements[0].timestamp,
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    shopfloor: device.shopfloor,
    pillarNo: device.pillarNo,
    address: device.address,
    temperature: sensors.find((s) => s.type === 'temperature')?.value ?? 0,
    humidity: sensors.find((s) => s.type === 'humidity')?.value ?? 0,
    speed: sensors.find((s) => s.type === 'speed')?.value ?? 0,
    current: sensors.find((s) => s.type === 'current')?.value ?? 0,
    vibration: sensors.find((s) => s.type === 'vibration')?.value ?? 0,
  };
}

function applyTemplate(template: string, context: PayloadContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = context[key as keyof PayloadContext];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

export function formatPayload(
  format: PayloadFormat,
  customPayload: string,
  counter: number,
  device: DeviceSettings,
): string {
  const context = createPayloadContext(counter, device);
  const devicePayload = buildDevicePayload(device);

  switch (format) {
    case 'json':
      return JSON.stringify(devicePayload, null, 2);

    case 'xml':
      return `<?xml version="1.0" encoding="UTF-8"?>
<device id="${device.deviceId}" name="${device.deviceName}">
  <location shopfloor="${device.shopfloor}" pillarNo="${device.pillarNo}" address="${device.address}"/>
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
        'device:',
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
      return new TextEncoder()
        .encode(JSON.stringify(devicePayload))
        .reduce((hex, b) => hex + b.toString(16).padStart(2, '0'), '');

    case 'custom':
      return applyTemplate(customPayload, context);

    default:
      return JSON.stringify(devicePayload, null, 2);
  }
}

function encodePreview(text: string, encoding: PayloadEncoding): string {
  switch (encoding) {
    case 'utf8':
      return text;
    case 'utf16': {
      const buf = new Uint8Array(text.length * 2);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        buf[i * 2] = code & 0xff;
        buf[i * 2 + 1] = code >> 8;
      }
      return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    case 'base64':
      return btoa(unescape(encodeURIComponent(text)));
    case 'binary':
      return Array.from(new TextEncoder().encode(text))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    default:
      return text;
  }
}

export function getPayloadPreview(settings: PublisherSettings): string {
  const device = {
    deviceId: settings.deviceId,
    deviceName: settings.deviceName,
    shopfloor: settings.shopfloor,
    pillarNo: settings.pillarNo,
    address: settings.address,
  };

  const text =
    settings.payloadMode === 'static'
      ? settings.payloadFormat === 'custom'
        ? applyTemplate(settings.staticPayload, createPayloadContext(1, device))
        : settings.staticPayload
      : formatPayload(settings.payloadFormat, settings.customPayload, 1, device);

  if (settings.payloadEncoding === 'utf8') {
    return text;
  }

  return `--- Raw ---\n${text}\n\n--- Encoded (${settings.payloadEncoding}) ---\n${encodePreview(text, settings.payloadEncoding)}`;
}

export { SAMPLE_DEVICE_PAYLOAD };
