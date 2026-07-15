import { useMqttPublisher } from './hooks/useMqttPublisher';
import { getPayloadPreview } from './utils/payloadFormatter';
import { SAMPLE_DEVICE_PAYLOAD } from './types';
import type {
  AuthMode,
  MqttVersion,
  PayloadEncoding,
  PayloadFormat,
  QosLevel,
} from './types';
import './App.css';

function App() {
  const {
    settings,
    stats,
    loading,
    apiError,
    updateSettings,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    publishOnce,
  } = useMqttPublisher();

  const preview = getPayloadPreview(settings);
  const connectionLocked = stats.connected || stats.connecting || loading;

  const statusLabel = stats.connected
    ? 'Connected'
    : stats.connecting || loading
      ? 'Connecting...'
      : 'Disconnected';

  const statusClass = stats.connected
    ? 'connected'
    : stats.connecting || loading
      ? 'connecting'
      : 'disconnected';

  const showUsername = settings.authMode === 'username' || settings.authMode === 'both';
  const showCerts =
    settings.useTls &&
    (settings.authMode === 'certificate' || settings.authMode === 'both');

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📡</span>
            <div>
              <h1>MQTT Publisher</h1>
              <p className="subtitle">Full-featured publisher with auth, LWT, encoding and payload control</p>
            </div>
          </div>
          <div className={`status-badge ${statusClass}`}>
            <span className="status-dot" />
            {statusLabel}
          </div>
        </div>
      </header>

      {apiError && (
        <div className="alert alert-error">
          <strong>⚠ {apiError}</strong>
        </div>
      )}

      {stats.lastError && (
        <div className="alert alert-warning">
          <strong>Broker error:</strong> {stats.lastError}
        </div>
      )}

      <main className="main-grid">
        <section className="card">
          <h2>Broker Connection</h2>
          <div className="form-grid">
            <label className="field">
              <span>Broker Host</span>
              <input
                type="text"
                value={settings.brokerHost}
                onChange={(e) => updateSettings({ brokerHost: e.target.value })}
                disabled={connectionLocked}
              />
            </label>
            <label className="field">
              <span>Port</span>
              <input
                type="number"
                value={settings.brokerPort}
                onChange={(e) => updateSettings({ brokerPort: Number(e.target.value) })}
                disabled={connectionLocked}
              />
            </label>
            <label className="field">
              <span>Client ID</span>
              <input
                type="text"
                value={settings.clientId}
                onChange={(e) => updateSettings({ clientId: e.target.value })}
                disabled={connectionLocked}
              />
            </label>
            <label className="field">
              <span>MQTT Version</span>
              <select
                value={settings.mqttVersion}
                onChange={(e) => updateSettings({ mqttVersion: e.target.value as MqttVersion })}
                disabled={connectionLocked}
              >
                <option value="3.1">MQTT 3.1</option>
                <option value="3.1.1">MQTT 3.1.1</option>
                <option value="5.0">MQTT 5.0</option>
              </select>
            </label>
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={settings.cleanSession}
                onChange={(e) => updateSettings({ cleanSession: e.target.checked })}
                disabled={connectionLocked}
              />
              <span>Clean Session</span>
            </label>
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={settings.useTls}
                onChange={(e) => updateSettings({ useTls: e.target.checked, brokerPort: e.target.checked ? 8883 : 1883 })}
                disabled={connectionLocked}
              />
              <span>Use TLS (mqtts)</span>
            </label>
          </div>
          <div className="button-row">
            {!stats.connected ? (
              <button className="btn btn-primary" onClick={connect} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            ) : (
              <button className="btn btn-danger" onClick={disconnect} disabled={loading}>
                Disconnect
              </button>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Authentication</h2>
          <div className="form-grid">
            <label className="field full-width">
              <span>Auth Mode</span>
              <select
                value={settings.authMode}
                onChange={(e) => updateSettings({ authMode: e.target.value as AuthMode })}
                disabled={connectionLocked}
              >
                <option value="none">None</option>
                <option value="username">Username / Password</option>
                <option value="certificate">Certificate (TLS)</option>
                <option value="both">Username + Certificate</option>
              </select>
            </label>

            {showUsername && (
              <>
                <label className="field">
                  <span>Username</span>
                  <input
                    type="text"
                    value={settings.username}
                    onChange={(e) => updateSettings({ username: e.target.value })}
                    disabled={connectionLocked}
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={settings.password}
                    onChange={(e) => updateSettings({ password: e.target.value })}
                    disabled={connectionLocked}
                  />
                </label>
              </>
            )}

            {settings.useTls && (
              <label className="field checkbox-field full-width">
                <input
                  type="checkbox"
                  checked={settings.rejectUnauthorized}
                  onChange={(e) => updateSettings({ rejectUnauthorized: e.target.checked })}
                  disabled={connectionLocked}
                />
                <span>Verify server certificate</span>
              </label>
            )}
          </div>

          {showCerts && (
            <div className="cert-fields">
              <label className="field full-width">
                <span>CA Certificate (PEM)</span>
                <textarea
                  rows={3}
                  value={settings.caCert}
                  onChange={(e) => updateSettings({ caCert: e.target.value })}
                  disabled={connectionLocked}
                  placeholder="-----BEGIN CERTIFICATE-----..."
                />
              </label>
              <label className="field full-width">
                <span>Client Certificate (PEM)</span>
                <textarea
                  rows={3}
                  value={settings.clientCert}
                  onChange={(e) => updateSettings({ clientCert: e.target.value })}
                  disabled={connectionLocked}
                  placeholder="-----BEGIN CERTIFICATE-----..."
                />
              </label>
              <label className="field full-width">
                <span>Client Private Key (PEM)</span>
                <textarea
                  rows={3}
                  value={settings.clientKey}
                  onChange={(e) => updateSettings({ clientKey: e.target.value })}
                  disabled={connectionLocked}
                  placeholder="-----BEGIN PRIVATE KEY-----..."
                />
              </label>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Last Will &amp; Testament (LWT)</h2>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={settings.lwtEnabled}
              onChange={(e) => updateSettings({ lwtEnabled: e.target.checked })}
              disabled={connectionLocked}
            />
            <span>Enable LWT</span>
          </label>

          {settings.lwtEnabled && (
            <div className="form-grid">
              <label className="field full-width">
                <span>LWT Topic</span>
                <input
                  type="text"
                  value={settings.lwtTopic}
                  onChange={(e) => updateSettings({ lwtTopic: e.target.value })}
                  disabled={connectionLocked}
                />
              </label>
              <label className="field full-width">
                <span>LWT Message</span>
                <input
                  type="text"
                  value={settings.lwtMessage}
                  onChange={(e) => updateSettings({ lwtMessage: e.target.value })}
                  disabled={connectionLocked}
                />
              </label>
              <label className="field">
                <span>LWT QoS</span>
                <select
                  value={settings.lwtQos}
                  onChange={(e) => updateSettings({ lwtQos: Number(e.target.value) as QosLevel })}
                  disabled={connectionLocked}
                >
                  <option value={0}>QoS 0</option>
                  <option value={1}>QoS 1</option>
                  <option value={2}>QoS 2</option>
                </select>
              </label>
              <label className="field checkbox-field">
                <input
                  type="checkbox"
                  checked={settings.lwtRetain}
                  onChange={(e) => updateSettings({ lwtRetain: e.target.checked })}
                  disabled={connectionLocked}
                />
                <span>LWT Retain</span>
              </label>
            </div>
          )}
        </section>

        <section className="card publish-card">
          <h2>Topic &amp; Payload</h2>

          <h3 className="section-subtitle">Device Info</h3>
          <div className="form-grid">
            <label className="field">
              <span>Device ID</span>
              <input
                type="text"
                value={settings.deviceId}
                onChange={(e) => updateSettings({ deviceId: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Device Name</span>
              <input
                type="text"
                value={settings.deviceName}
                onChange={(e) => updateSettings({ deviceName: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Shopfloor</span>
              <input
                type="text"
                value={settings.shopfloor}
                onChange={(e) => updateSettings({ shopfloor: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Pillar No</span>
              <input
                type="number"
                value={settings.pillarNo}
                onChange={(e) => updateSettings({ pillarNo: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span>Address / Zone</span>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => updateSettings({ address: e.target.value })}
              />
            </label>
          </div>

          <h3 className="section-subtitle">Publish Settings</h3>
          <div className="form-grid">
            <label className="field full-width">
              <span>Topic</span>
              <input
                type="text"
                value={settings.topic}
                onChange={(e) => updateSettings({ topic: e.target.value })}
                placeholder="e.g. sensors/data"
              />
            </label>

            <label className="field">
              <span>QoS</span>
              <select
                value={settings.qos}
                onChange={(e) => updateSettings({ qos: Number(e.target.value) as QosLevel })}
              >
                <option value={0}>QoS 0 — At most once</option>
                <option value={1}>QoS 1 — At least once</option>
                <option value={2}>QoS 2 — Exactly once</option>
              </select>
            </label>

            <label className="field">
              <span>Interval (ms)</span>
              <input
                type="number"
                min={100}
                step={100}
                value={settings.intervalMs}
                onChange={(e) => updateSettings({ intervalMs: Number(e.target.value) })}
              />
            </label>

            <label className="field">
              <span>Payload Source</span>
              <select
                value={
                  settings.payloadMode === 'static'
                    ? 'static'
                    : settings.payloadFormat === 'custom'
                      ? 'custom'
                      : 'generated'
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'static') {
                    updateSettings({ payloadMode: 'static' });
                  } else if (v === 'custom') {
                    updateSettings({ payloadMode: 'generated', payloadFormat: 'custom' });
                  } else {
                    updateSettings({ payloadMode: 'generated', payloadFormat: settings.payloadFormat === 'custom' ? 'json' : settings.payloadFormat });
                  }
                }}
              >
                <option value="static">Manual — type your payload</option>
                <option value="generated">Auto-generated</option>
                <option value="custom">Template with variables</option>
              </select>
            </label>

            {settings.payloadMode === 'generated' && settings.payloadFormat !== 'custom' && (
              <label className="field">
                <span>Serialization</span>
                <select
                  value={settings.payloadFormat}
                  onChange={(e) => updateSettings({ payloadFormat: e.target.value as PayloadFormat })}
                >
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                  <option value="csv">CSV</option>
                  <option value="text">Plain Text</option>
                  <option value="yaml">YAML</option>
                  <option value="hex">Hex</option>
                </select>
              </label>
            )}

            <label className="field">
              <span>Encoding</span>
              <select
                value={settings.payloadEncoding}
                onChange={(e) => updateSettings({ payloadEncoding: e.target.value as PayloadEncoding })}
              >
                <option value="utf8">UTF-8</option>
                <option value="utf16">UTF-16</option>
                <option value="base64">Base64</option>
                <option value="binary">Binary (hex input)</option>
              </select>
            </label>

            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={settings.retain}
                onChange={(e) => updateSettings({ retain: e.target.checked })}
              />
              <span>Retain</span>
            </label>
          </div>

          <label className="field full-width payload-editor">
            <span className="payload-label-row">
              <span>
                {settings.payloadMode === 'static'
                  ? 'Payload'
                  : settings.payloadFormat === 'custom'
                    ? 'Payload Template'
                    : 'Payload (auto-generated — switch source to Manual to edit)'}
              </span>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => updateSettings({ payloadMode: 'static', staticPayload: SAMPLE_DEVICE_PAYLOAD })}
              >
                Load sample payload
              </button>
            </span>
            <textarea
              rows={6}
              value={
                settings.payloadMode === 'static'
                  ? settings.staticPayload
                  : settings.payloadFormat === 'custom'
                    ? settings.customPayload
                    : settings.staticPayload
              }
              onChange={(e) => {
                const value = e.target.value;
                if (settings.payloadMode === 'generated' && settings.payloadFormat !== 'custom') {
                  updateSettings({ payloadMode: 'static', staticPayload: value });
                  return;
                }
                if (settings.payloadFormat === 'custom') {
                  updateSettings({ customPayload: value });
                  return;
                }
                updateSettings({ staticPayload: value });
              }}
              disabled={settings.payloadMode === 'generated' && settings.payloadFormat !== 'custom'}
              placeholder='{"message": "hello", "value": 42}'
            />
            <small className="hint">
              {settings.payloadMode === 'static' && 'Type the exact message to publish.'}
              {settings.payloadFormat === 'custom' &&
                'Variables: {{timestamp}}, {{counter}}, {{value}}, {{temperature}}, {{humidity}}, {{pressure}}'}
              {settings.payloadMode === 'generated' && settings.payloadFormat !== 'custom' &&
                'Select "Manual — type your payload" above to enter your own message.'}
            </small>
          </label>

          <div className="button-row">
            <button
              className="btn btn-secondary"
              onClick={publishOnce}
              disabled={!stats.connected || loading}
            >
              Publish Once
            </button>
            {!stats.streaming ? (
              <button
                className="btn btn-success"
                onClick={startStreaming}
                disabled={!stats.connected || loading}
              >
                Start Streaming
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopStreaming} disabled={loading}>
                Stop Streaming
              </button>
            )}
          </div>
        </section>

        <section className="card stats-card">
          <h2>Live Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Messages Sent</span>
              <span className="stat-value">{stats.messagesSent}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Streaming</span>
              <span className={`stat-value ${stats.streaming ? 'active' : ''}`}>
                {stats.streaming ? 'Active' : 'Idle'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">MQTT</span>
              <span className="stat-value small">{settings.mqttVersion}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Encoding</span>
              <span className="stat-value small">{settings.payloadEncoding.toUpperCase()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Clean Session</span>
              <span className="stat-value small">{settings.cleanSession ? 'Yes' : 'No'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Retain</span>
              <span className="stat-value small">{settings.retain ? 'Yes' : 'No'}</span>
            </div>
            <div className="stat-item full-width">
              <span className="stat-label">Last Published</span>
              <span className="stat-value small">
                {stats.lastPublishedAt ? new Date(stats.lastPublishedAt).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </section>

        <section className="card preview-card">
          <h2>Payload Preview</h2>
          <pre className="payload-preview">{preview}</pre>
          {stats.lastPayload && (
            <>
              <h3 className="preview-subtitle">Last Published (Raw)</h3>
              <pre className="payload-preview last">{stats.lastPayload}</pre>
            </>
          )}
          {stats.lastPayloadEncoded && settings.payloadEncoding !== 'utf8' && (
            <>
              <h3 className="preview-subtitle">Last Published (Encoded)</h3>
              <pre className="payload-preview last">{stats.lastPayloadEncoded}</pre>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>
          Broker: <code>{settings.useTls ? 'mqtts' : 'mqtt'}://{settings.brokerHost}:{settings.brokerPort}</code>
          {' · '}
          Topic: <code>{settings.topic}</code>
          {' · '}
          Auth: <code>{settings.authMode}</code>
        </p>
      </footer>
    </div>
  );
}

export default App;
