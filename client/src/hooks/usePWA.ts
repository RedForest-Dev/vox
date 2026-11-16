import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'vox_pwa_installed';

/** True when the page is already running as an installed app. */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isStorageInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function detectIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac with touch support
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export type InstallResult = 'native' | 'manual';

export function usePWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone() || isStorageInstalled());
  const [isIOS] = useState<boolean>(detectIOS);

  useEffect(() => {
    // If currently running inside the standalone PWA window, remember it
    if (isStandalone()) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
    }

    // Native query in Chromium (Chrome, Edge)
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> })
        .getInstalledRelatedApps?.()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            setInstalled(true);
            try {
              localStorage.setItem(STORAGE_KEY, 'true');
            } catch {}
          }
        })
        .catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // If browser actively offers installation and we are not in standalone,
      // it means the app is not currently installed (or was uninstalled)
      if (!isStandalone()) {
        setInstalled(false);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
    };

    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
    };

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayMode = () => {
      if (isStandalone()) {
        setInstalled(true);
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {}
      }
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplayMode);
    };
  }, []);

  /**
   * Shows the native install dialog when the browser allows it ("native").
   * Otherwise the caller must show manual instructions ("manual").
   */
  const install = useCallback(async (): Promise<InstallResult> => {
    if (!deferred) return 'manual';
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') {
      setInstalled(true);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
    }
    return 'native';
  }, [deferred]);

  return { installed, isIOS, install };
}
