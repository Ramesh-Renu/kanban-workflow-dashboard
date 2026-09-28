/**
 * Track Application Hub apps opened from Orion in named browser windows.
 *
 * Limitation: browsers cannot list other tabs. We only track windows Orion
 * opened, and sync open/closed state across Orion tabs via BroadcastChannel
 * + localStorage.
 */

const CHANNEL_NAME = "orion-hub-open-apps";
const STORAGE_KEY = "orion_hub_open_apps";

const openWindows = new Map();
const listeners = new Set();

let channel = null;

const readStorageMap = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeStorageMap = (map) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
};

const notify = () => {
  const snapshot = getOpenHubAppIds();
  listeners.forEach((listener) => listener(snapshot));
};

const syncPublishedMap = () => {
  const next = { ...readStorageMap() };

  openWindows.forEach((win, appId) => {
    if (win && !win.closed) next[appId] = Date.now();
    else {
      openWindows.delete(appId);
      delete next[appId];
    }
  });

  writeStorageMap(next);
  try {
    getChannel()?.postMessage({ type: "sync", apps: next });
  } catch {
    // ignore
  }
  notify();
};

const getChannel = () => {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => notify();
  } catch {
    channel = null;
  }
  return channel;
};

export const getHubWindowName = (appId) => `orion_hub_${appId}`;

export const getOpenHubAppIds = () => {
  const openIds = new Set(Object.keys(readStorageMap()));
  openWindows.forEach((win, appId) => {
    if (win && !win.closed) openIds.add(appId);
    else {
      openWindows.delete(appId);
      openIds.delete(appId);
    }
  });
  return openIds;
};

export const isHubAppOpen = (appId) => getOpenHubAppIds().has(appId);

export const openHubApp = (appId, url) => {
  if (!appId || !url) return null;
  const name = getHubWindowName(appId);
  const existing = openWindows.get(appId);
  if (existing && !existing.closed) {
    try {
      existing.focus();
    } catch {
      // ignore
    }
    syncPublishedMap();
    return existing;
  }

  const win = window.open(url, name);
  if (win) {
    openWindows.set(appId, win);
    syncPublishedMap();
  }
  return win;
};

export const focusHubApp = (appId) => {
  const win = openWindows.get(appId);
  if (!win || win.closed) return false;
  try {
    win.focus();
    return true;
  } catch {
    return false;
  }
};

export const subscribeHubOpenApps = (listener) => {
  listeners.add(listener);
  getChannel();
  listener(getOpenHubAppIds());
  return () => listeners.delete(listener);
};

/** Poll local window refs; prune closed apps from storage + notify subscribers. */
export const startHubOpenAppsWatcher = (intervalMs = 1000) => {
  getChannel();

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);

  const id = window.setInterval(() => {
    let closedAny = false;
    openWindows.forEach((win, appId) => {
      if (!win || win.closed) {
        openWindows.delete(appId);
        const stored = readStorageMap();
        if (stored[appId]) {
          delete stored[appId];
          writeStorageMap(stored);
        }
        closedAny = true;
      }
    });
    if (closedAny) {
      try {
        getChannel()?.postMessage({ type: "sync", apps: readStorageMap() });
      } catch {
        // ignore
      }
      notify();
    }
  }, intervalMs);

  return () => {
    window.clearInterval(id);
    window.removeEventListener("storage", onStorage);
  };
};
