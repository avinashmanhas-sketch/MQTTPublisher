import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { buildPublishPayload, SAMPLE_DEVICE_PAYLOAD } from './payloadUtils.js';

const MQTT_VERSION_MAP = {
  '3.1': 3,
  '3.1.1': 4,
  '5.0': 5,
};

const DEFAULT_SETTINGS = {
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

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  let client = null;
  let publishTimer = null;
  let messageCounter = 0;
  let connectInProgress = false;

  let settings = { ...DEFAULT_SETTINGS, clientId: `publisher-${Math.random().toString(36).slice(2, 8)}` };

  let stats = {
    connected: false,
    connecting: false,
    streaming: false,
    messagesSent: 0,
    lastPublishedAt: null,
    lastPayload: null,
    lastPayloadEncoded: null,
    lastError: null,
  };

  function stopPublishing() {
    if (publishTimer) {
      clearInterval(publishTimer);
      publishTimer = null;
    }
    stats.streaming = false;
  }

  function teardownClient() {
    if (!client) return;
    const oldClient = client;
    client = null;
    oldClient.removeAllListeners();
    oldClient.end(true);
  }

  function disconnectClient() {
    stopPublishing();
    teardownClient();
    stats.connected = false;
    stats.connecting = false;
  }

  function buildTlsOptions(activeSettings) {
    if (!activeSettings.useTls) return {};

    const tls = {
      rejectUnauthorized: activeSettings.rejectUnauthorized,
    };

    if (activeSettings.caCert?.trim()) {
      tls.ca = activeSettings.caCert;
    }
    if (activeSettings.clientCert?.trim()) {
      tls.cert = activeSettings.clientCert;
    }
    if (activeSettings.clientKey?.trim()) {
      tls.key = activeSettings.clientKey;
    }

    return tls;
  }

  function buildConnectOptions(activeSettings) {
    const options = {
      clientId: activeSettings.clientId,
      clean: activeSettings.cleanSession,
      reconnectPeriod: 0,
      connectTimeout: 8000,
      protocolVersion: MQTT_VERSION_MAP[activeSettings.mqttVersion] ?? 4,
      ...buildTlsOptions(activeSettings),
    };

    const useUsername =
      activeSettings.authMode === 'username' || activeSettings.authMode === 'both';
    if (useUsername && activeSettings.username) {
      options.username = activeSettings.username;
      options.password = activeSettings.password;
    }

    const useCert =
      activeSettings.useTls &&
      (activeSettings.authMode === 'certificate' || activeSettings.authMode === 'both');
    if (useCert && !activeSettings.clientCert?.trim()) {
      throw new Error('Certificate authentication requires a client certificate');
    }

    if (activeSettings.lwtEnabled && activeSettings.lwtTopic?.trim()) {
      options.will = {
        topic: activeSettings.lwtTopic,
        payload: activeSettings.lwtMessage,
        qos: activeSettings.lwtQos,
        retain: activeSettings.lwtRetain,
      };
    }

    return options;
  }

  function attachClientListeners(activeClient) {
    activeClient.on('error', (err) => {
      stats.lastError = err.message;
      stats.connected = false;
      stats.connecting = false;
    });

    activeClient.on('close', () => {
      stats.connected = false;
      stats.connecting = false;
      stats.streaming = false;
      if (client === activeClient) {
        client = null;
      }
    });

    activeClient.on('offline', () => {
      stats.connected = false;
      stats.connecting = false;
    });
  }

  function connectToBroker(activeSettings) {
    return new Promise((resolve, reject) => {
      const protocol = activeSettings.useTls ? 'mqtts' : 'mqtt';
      const url = `${protocol}://${activeSettings.brokerHost}:${activeSettings.brokerPort}`;

      let options;
      try {
        options = buildConnectOptions(activeSettings);
      } catch (err) {
        reject(err);
        return;
      }

      stats.connecting = true;
      stats.connected = false;
      stats.lastError = null;

      const newClient = mqtt.connect(url, options);
      client = newClient;

      let settled = false;

      const timeoutId = setTimeout(() => {
        finish(new Error(`Connection timed out — could not reach ${url}`));
      }, 10000);

      function finish(err) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        newClient.removeListener('connect', onConnect);
        newClient.removeListener('error', onError);

        if (err) {
          stats.connecting = false;
          stats.connected = false;
          stats.lastError = err.message;
          if (client === newClient) {
            teardownClient();
          }
          reject(err);
          return;
        }

        stats.connecting = false;
        stats.connected = true;
        stats.lastError = null;
        attachClientListeners(newClient);
        resolve({ url });
      }

      function onConnect() {
        finish(null);
      }

      function onError(err) {
        finish(err);
      }

      newClient.once('connect', onConnect);
      newClient.once('error', onError);
    });
  }

  function publishOnce() {
    if (!client || !stats.connected) return;

    messageCounter += 1;
    const { text, wirePayload, encodedPreview } = buildPublishPayload(settings, messageCounter);

    client.publish(
      settings.topic,
      wirePayload,
      { qos: settings.qos, retain: settings.retain },
      (err) => {
        if (err) {
          stats.lastError = err.message;
          return;
        }
        stats.messagesSent += 1;
        stats.lastPublishedAt = new Date().toISOString();
        stats.lastPayload = text;
        stats.lastPayloadEncoded = encodedPreview;
        stats.lastError = null;
      },
    );
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/status', (_req, res) => {
    res.json({ settings, stats });
  });

  app.post('/api/settings', (req, res) => {
    settings = { ...settings, ...req.body };
    res.json({ settings });
  });

  app.post('/api/connect', async (req, res) => {
    if (connectInProgress) {
      return res.status(409).json({ success: false, error: 'Connection already in progress' });
    }

    if (req.body) {
      settings = { ...settings, ...req.body };
    }

    connectInProgress = true;
    disconnectClient();
    connectInProgress = true;

    try {
      const result = await connectToBroker(settings);
      res.json({ success: true, connected: true, message: `Connected to ${result.url}` });
    } catch (err) {
      res.status(500).json({ success: false, connected: false, error: err.message });
    } finally {
      connectInProgress = false;
    }
  });

  app.post('/api/disconnect', (_req, res) => {
    disconnectClient();
    messageCounter = 0;
    res.json({ success: true });
  });

  app.post('/api/stream/start', (req, res) => {
    if (!client || !stats.connected) {
      return res.status(400).json({ success: false, error: 'Not connected to broker' });
    }

    if (req.body) {
      settings = { ...settings, ...req.body };
    }

    stopPublishing();
    stats.streaming = true;
    publishOnce();
    publishTimer = setInterval(publishOnce, settings.intervalMs);

    res.json({ success: true, message: 'Streaming started' });
  });

  app.post('/api/stream/stop', (_req, res) => {
    stopPublishing();
    res.json({ success: true, message: 'Streaming stopped' });
  });

  app.post('/api/publish/once', (req, res) => {
    if (!client || !stats.connected) {
      return res.status(400).json({ success: false, error: 'Not connected to broker' });
    }

    if (req.body) {
      settings = { ...settings, ...req.body };
    }

    publishOnce();
    res.json({ success: true });
  });

  return app;
}
