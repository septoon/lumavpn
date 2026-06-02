'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginTelegramWebApp, type TelegramWebAppAuthResult } from '../lib/api';

type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: TelegramWebAppUser };
  safeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number };
  contentSafeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number };
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (eventType: string, eventHandler: () => void) => void;
  offEvent?: (eventType: string, eventHandler: () => void) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type TwaContextValue = {
  isTwa: boolean;
  isLoading: boolean;
  user: TelegramWebAppAuthResult['telegramUser'] | null;
  appUser: TelegramWebAppAuthResult['user'] | null;
  isAdmin: boolean;
  accessToken: string;
  error: string;
};

const TwaContext = createContext<TwaContextValue>({
  isTwa: false,
  isLoading: true,
  user: null,
  appUser: null,
  isAdmin: false,
  accessToken: '',
  error: ''
});

function applySafeArea(webApp: TelegramWebApp) {
  const safeTop = Number(webApp.safeAreaInset?.top ?? 0);
  const contentTop = Number(webApp.contentSafeAreaInset?.top ?? 0);
  const top = Math.max(safeTop, contentTop, 64);
  document.documentElement.classList.add('is-twa');
  document.documentElement.style.setProperty('--twa-safe-area-top', `${top}px`);
}

function fromUnsafeUser(user?: TelegramWebAppUser): TwaContextValue['user'] {
  if (!user?.id) return null;
  return {
    id: String(user.id),
    username: user.username ?? null,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    photoUrl: user.photo_url ?? null
  };
}

export function TwaProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TwaContextValue>({
    isTwa: false,
    isLoading: true,
    user: null,
    appUser: null,
    isAdmin: false,
    accessToken: '',
    error: ''
  });

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      setState((current) => ({ ...current, isLoading: false }));
      return;
    }

    const updateSafeArea = () => applySafeArea(webApp);
    updateSafeArea();
    webApp.ready?.();
    webApp.expand?.();
    webApp.setHeaderColor?.('#05080d');
    webApp.setBackgroundColor?.('#05080d');
    webApp.onEvent?.('viewportChanged', updateSafeArea);
    webApp.onEvent?.('safeAreaChanged', updateSafeArea);
    webApp.onEvent?.('contentSafeAreaChanged', updateSafeArea);

    const unsafeUser = fromUnsafeUser(webApp.initDataUnsafe?.user);
    setState((current) => ({
      ...current,
      isTwa: true,
      user: unsafeUser,
      isLoading: Boolean(webApp.initData)
    }));

    if (!webApp.initData) {
      setState((current) => ({
        ...current,
        isTwa: true,
        isLoading: false,
        error: 'Telegram initData не передан'
      }));
      return () => {
        webApp.offEvent?.('viewportChanged', updateSafeArea);
        webApp.offEvent?.('safeAreaChanged', updateSafeArea);
        webApp.offEvent?.('contentSafeAreaChanged', updateSafeArea);
      };
    }

    loginTelegramWebApp(webApp.initData)
      .then((result) => {
        setState({
          isTwa: true,
          isLoading: false,
          user: result.telegramUser,
          appUser: result.user,
          isAdmin: result.isAdmin,
          accessToken: result.accessToken ?? '',
          error: ''
        });
      })
      .catch(() => {
        setState((current) => ({
          ...current,
          isTwa: true,
          isLoading: false,
          error: 'Не удалось авторизоваться через Telegram'
        }));
      });

    return () => {
      webApp.offEvent?.('viewportChanged', updateSafeArea);
      webApp.offEvent?.('safeAreaChanged', updateSafeArea);
      webApp.offEvent?.('contentSafeAreaChanged', updateSafeArea);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return <TwaContext.Provider value={value}>{children}</TwaContext.Provider>;
}

export function useTwa() {
  return useContext(TwaContext);
}
