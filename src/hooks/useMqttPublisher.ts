import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublisherSettings, PublisherStats } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const API_BASE = '/api';

async function apiCall<T>(path: string, options?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });

    let data: Record<string, unknown> = {};
    try {
      data = await response.json();
    } catch {
      throw new Error('Backend returned an invalid response');
    }

    if (!response.ok) {
      throw new Error((data.error as string) || 'Request failed');
    }

    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Restart the app with: npm run dev');
    }
    if (err instanceof TypeError) {
      throw new Error('Cannot reach backend. Run: npm run dev');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function useMqttPublisher() {
  const [settings, setSettings] = useState<PublisherSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<PublisherStats>({
    connected: false,
    connecting: false,
    streaming: false,
    messagesSent: 0,
    lastPublishedAt: null,
    lastPayload: null,
    lastPayloadEncoded: null,
    lastError: null,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const data = await apiCall<{ settings: PublisherSettings; stats: PublisherStats }>('/status');
      setStats(data.stats);
      setApiError(null);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Backend unavailable');
    }
  }, []);

  const loadInitialState = useCallback(async () => {
    try {
      const data = await apiCall<{ settings: PublisherSettings; stats: PublisherStats }>('/status');
      setSettings(data.settings);
      setStats(data.stats);
      setApiError(null);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Backend unavailable');
    }
  }, []);

  const syncSettingsToServer = useCallback((nextSettings: PublisherSettings) => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(async () => {
      try {
        await apiCall('/settings', {
          method: 'POST',
          body: JSON.stringify(nextSettings),
        });
      } catch {
        // Background sync — ignore; next publish will send latest settings
      }
    }, 400);
  }, []);

  useEffect(() => {
    loadInitialState();
    const interval = setInterval(refreshStats, 1000);
    return () => {
      clearInterval(interval);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [loadInitialState, refreshStats]);

  const updateSettings = (partial: Partial<PublisherSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      syncSettingsToServer(next);
      return next;
    });
  };

  const connect = async () => {
    setLoading(true);
    setApiError(null);
    try {
      await apiCall('/connect', { method: 'POST', body: JSON.stringify(settingsRef.current) }, 20000);
      await refreshStats();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Connection failed');
      await refreshStats();
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await apiCall('/disconnect', { method: 'POST' });
      setApiError(null);
      await refreshStats();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  };

  const startStreaming = async () => {
    setLoading(true);
    try {
      await apiCall('/stream/start', { method: 'POST', body: JSON.stringify(settingsRef.current) });
      setApiError(null);
      await refreshStats();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to start streaming');
    } finally {
      setLoading(false);
    }
  };

  const stopStreaming = async () => {
    setLoading(true);
    try {
      await apiCall('/stream/stop', { method: 'POST' });
      setApiError(null);
      await refreshStats();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to stop streaming');
    } finally {
      setLoading(false);
    }
  };

  const publishOnce = async () => {
    setLoading(true);
    try {
      await apiCall('/publish/once', { method: 'POST', body: JSON.stringify(settingsRef.current) });
      setApiError(null);
      await refreshStats();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
