'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';

/**
 * BeforeInstallPromptEvent isn't in lib.dom.d.ts; declare the shape we need.
 * https://developer.mozilla.org/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPad on iOS 13+ reports as Mac; sniff for touch + platform as a tiebreaker.
  const iPadOS =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari uses a non-standard navigator.standalone flag.
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function InstallAppCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isIOS, setIsIOS] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (detectStandalone()) {
      setHidden(true);
      return;
    }

    const ios = detectIOS();
    setIsIOS(ios);
    // On iOS we have no install event, but we still want to show the manual hint.
    if (ios) setHidden(false);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onInstallClick = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
      setDeferred(null);
      setHidden(true);
    }
  }, [deferred]);

  if (hidden) return null;

  return (
    <div
      className="overflow-hidden rounded-[22px] p-5"
      style={{
        background:
          'radial-gradient(120% 100% at 100% 0%, rgba(52,199,89,0.14) 0%, rgba(52,199,89,0) 55%), #0A0A0A',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(52,199,89,0.15)' }}
        >
          <Download size={18} strokeWidth={2.4} className="text-accent-green" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-tight tracking-tight">
            Установить приложение
          </h3>
          {isIOS && !deferred ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[12.5px] leading-snug text-text-secondary">
              <span>В Safari нажмите</span>
              <Share
                size={13}
                strokeWidth={2.4}
                className="inline-block text-text-secondary"
              />
              <span>→ «На экран Домой»</span>
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] leading-snug text-text-secondary">
              Откройте Gym Tracker одним тапом с домашнего экрана
            </p>
          )}
        </div>
      </div>

      {!isIOS && deferred && (
        <button
          type="button"
          onClick={onInstallClick}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl text-[14px] font-semibold text-black active:opacity-90 transition-opacity"
          style={{
            background:
              'linear-gradient(180deg, #4FD86F 0%, #34C759 50%, #2BA84B 100%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px -10px rgba(52,199,89,0.6)',
          }}
        >
          Установить
        </button>
      )}
    </div>
  );
}
