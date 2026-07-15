export type QosLevel = 0 | 1 | 2;

export type MqttVersion = '3.1' | '3.1.1' | '5.0';

export type PayloadFormat = 'json' | 'xml' | 'csv' | 'text' | 'yaml' | 'hex' | 'custom';

export type PayloadEncoding = 'utf8' | 'utf16' | 'base64' | 'binary';

export type PayloadMode = 'generated' | 'static';

export type AuthMode = 'none' | 'username' | 'certificate' | 'both';

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

export interface PublisherSettings {
  brokerHost: string;
  brokerPort: number;
  clientId: string;
  mqttVersion: MqttVersion;
  cleanSession: boolean;

  authMode: AuthMode;
  username: string;
  password: string;
  useTls: boolean;
  rejectUnauthorized: boolean;
  caCert: string;
  clientCert: string;
  clientKey: string;

  lwtEnabled: boolean;
  lwtTopic: string;
  lwtMessage: string;
  lwtQos: QosLevel;
  lwtRetain: boolean;

  topic: string;
  qos: QosLevel;
  retain: boolean;
  intervalMs: number;

  deviceId: string;
  deviceName: string;
  shopfloor: string;
  pillarNo: number;
  address: string;

  payloadMode: PayloadMode;
  payloadFormat: PayloadFormat;
  payloadEncoding: PayloadEncoding;
  customPayload: string;
  staticPayload: string;
}

export interface PublisherStats {
  connected: boolean;
  connecting: boolean;
  streaming: boolean;
  messagesSent: number;
  lastPublishedAt: string | null;
  lastPayload: string | null;
  lastPayloadEncoded: string | null;
  lastError: string | null;
}

export const DEFAULT_SETTINGS: PublisherSettings = {
  brokerHost: '10.127.126.157',
  brokerPort: 1883,
  clientId: `publisher-${Math.random().toString(36).slice(2, 8)}`,
  mqttVersion: '3.1.1',
  cleanSession: true,

  authMode: 'none',
  username: '',
  password: '',
  useTls: false,
  rejectUnauthorized: true,
  caCert: '',
  clientCert: '',
  clientKey: '',

  lwtEnabled: false,
  lwtTopic: 'status/client',
  lwtMessage: 'offline',
  lwtQos: 0,
  lwtRetain: false,

  topic: 'test/data',
  qos: 0,
  retain: false,
  intervalMs: 1000,

  deviceId: 'device-nishkarsh-1',
  deviceName: 'Machine A',
  shopfloor: 'Floor 1',
  pillarNo: 12,
  address: 'Zone A',

  payloadMode: 'static',
  payloadFormat: 'json',
  payloadEncoding: 'utf8',
  customPayload: SAMPLE_DEVICE_PAYLOAD,
  staticPayload: SAMPLE_DEVICE_PAYLOAD,
};

export const MQTT_VERSION_MAP: Record<MqttVersion, number> = {
  '3.1': 3,
  '3.1.1': 4,
  '5.0': 5,
};
