'use client';

import Link from 'next/link';
import {
  Apple,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Monitor,
  QrCode,
  Rocket,
  Shield,
  Smartphone,
  TabletSmartphone
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getUserAccess, type UserAccess } from '../../lib/api';
import { useTwa } from '../../components/twa-provider';

type Platform = 'ios' | 'android' | 'windows' | 'tv';
type Method = 'shadowrocket' | 'amnezia' | 'mtproto';

const platforms: Array<{ id: Platform; title: string; subtitle: string; icon: typeof Apple }> = [
  { id: 'ios', title: 'iOS / macOS', subtitle: 'Shadowrocket или AmneziaWG', icon: Apple },
  { id: 'android', title: 'Android', subtitle: 'AmneziaWG или MTProto', icon: Smartphone },
  { id: 'windows', title: 'Windows', subtitle: 'AmneziaWG', icon: Monitor },
  { id: 'tv', title: 'TV / роутер', subtitle: 'ручная настройка', icon: TabletSmartphone }
];

const methods: Array<{
  id: Method;
  title: string;
  subtitle: string;
  installLabel: string;
  installUrl?: string;
  type: UserAccess['configs'][number]['type'];
  icon: typeof Rocket;
  platforms: Platform[];
}> = [
  {
    id: 'shadowrocket',
    title: 'Shadowrocket',
    subtitle: 'VLESS Reality, быстрый импорт ссылкой',
    installLabel: 'Скачать в App Store',
    installUrl: 'https://apps.apple.com/us/app/shadowrocket/id932747118',
    type: 'VLESS',
    icon: Rocket,
    platforms: ['ios']
  },
  {
    id: 'amnezia',
    title: 'AmneziaWG',
    subtitle: 'WireGuard-конфиг для AmneziaWG',
    installLabel: 'Скачать Amnezia',
    installUrl: 'https://amnezia.org/',
    type: 'AMNEZIA',
    icon: Shield,
    platforms: ['ios', 'android', 'windows', 'tv']
  },
  {
    id: 'mtproto',
    title: 'MTProto',
    subtitle: 'резервный Telegram Proxy',
    installLabel: 'Отдельная установка не нужна',
    type: 'MTPROXY',
    icon: QrCode,
    platforms: ['ios', 'android', 'tv']
  }
];

function Stepper({ step }: { step: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className={`h-1.5 rounded-full ${item <= step ? 'bg-lime' : 'bg-white/25'}`} />
      ))}
    </div>
  );
}

function copy(value?: string) {
  if (!value) return;
  void navigator.clipboard.writeText(value);
}

export default function ConnectPage() {
  const { user, appUser, isLoading, error } = useTwa();
  const [platform, setPlatform] = useState<Platform>('ios');
  const [method, setMethod] = useState<Method>('shadowrocket');
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessError, setAccessError] = useState('');
  const deviceFingerprint = user?.id ? `telegram:${user.id}` : undefined;
  const availableMethods = useMemo(() => methods.filter((item) => item.platforms.includes(platform)), [platform]);
  const selectedMethod = methods.find((item) => item.id === method) ?? methods[0];
  const SelectedMethodIcon = selectedMethod.icon;
  const selectedConfig = access?.configs.find((config) => config.type === selectedMethod.type);

  useEffect(() => {
    if (!availableMethods.some((item) => item.id === method)) {
      setMethod(availableMethods[0]?.id ?? 'amnezia');
    }
  }, [availableMethods, method]);

  useEffect(() => {
    if (!appUser?.id) return;
    getUserAccess(appUser.id, deviceFingerprint)
      .then((result) => {
        setAccess(result);
        setAccessError('');
      })
      .catch(() => setAccessError('Не удалось загрузить ключи'));
  }, [appUser?.id, deviceFingerprint]);

  return (
    <main className="min-h-dvh bg-[#05080d] px-4 py-6 text-white sm:bg-transparent">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="grid h-14 w-14 place-items-center rounded-full bg-white text-black">
            <ArrowLeft className="h-7 w-7" />
          </Link>
          <div className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white">
            {isLoading ? 'Telegram...' : user?.firstName || user?.username || 'LumaVPN'}
          </div>
        </header>

        <Stepper step={selectedConfig ? 3 : 2} />

        <section>
          <div className="inline-flex rounded-full bg-lime px-5 py-2 text-sm font-extrabold text-black">ШАГ №1</div>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-normal text-white">Выберите тип устройства</h1>
        </section>

        <section className="twa-panel overflow-hidden p-0">
          {platforms.map(({ id, title, subtitle, icon: Icon }) => {
            const active = platform === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPlatform(id)}
                className="flex min-h-24 w-full items-center gap-4 border-b border-white/10 px-5 text-left last:border-b-0"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-black text-white">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-semibold">{title}</span>
                  <span className="mt-1 block text-sm text-twa-muted">{subtitle}</span>
                </span>
                <span className={`grid h-9 w-9 place-items-center rounded-full border-4 ${active ? 'border-lime text-lime' : 'border-white/35 text-transparent'}`}>
                  <Check className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </section>

        <section>
          <div className="inline-flex rounded-full bg-lime px-5 py-2 text-sm font-extrabold text-black">ШАГ №2</div>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight text-white">Скачайте приложение</h2>
          <p className="mt-3 text-lg leading-7 text-twa-muted">Выберите клиент под ваш протокол. Если приложение уже установлено, переходите к импорту.</p>
        </section>

        <section className="grid gap-3">
          {availableMethods.map(({ id, title, subtitle, icon: Icon }) => {
            const active = method === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`flex min-h-20 items-center gap-4 rounded-[26px] border px-5 text-left ${
                  active ? 'border-lime bg-white/8 shadow-[0_0_0_1px_rgba(220,255,37,0.22)]' : 'border-white/10 bg-white/6'
                }`}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black text-lime">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl font-semibold text-white">{title}</span>
                  <span className="mt-1 block text-sm text-twa-muted">{subtitle}</span>
                </span>
                <ChevronRight className="h-6 w-6 shrink-0 text-white/70" />
              </button>
            );
          })}
        </section>

        <section>
          <div className="inline-flex rounded-full bg-lime px-5 py-2 text-sm font-extrabold text-black">ШАГ №3</div>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight text-white">Импорт подписки</h2>
          <p className="mt-3 text-lg leading-7 text-twa-muted">
            {selectedConfig
              ? 'Добавьте конфигурацию в приложение кнопкой или скопируйте вручную.'
              : 'Активируйте подписку, чтобы получить конфигурации для этого устройства.'}
          </p>
        </section>

        {(error || accessError) && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error || accessError}</div>}

        <section className="twa-panel p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-black text-lime">
              <SelectedMethodIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-semibold text-white">{selectedMethod.title}</div>
              <div className="text-sm text-twa-muted">{selectedMethod.subtitle}</div>
            </div>
          </div>

          {selectedMethod.installUrl ? (
            <a
              href={selectedMethod.installUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl border border-lime bg-lime/10 px-4 text-base font-bold text-lime"
            >
              {selectedMethod.installLabel}
            </a>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 p-4 text-center text-sm font-semibold text-twa-muted">
              {selectedMethod.installLabel}
            </div>
          )}

          {selectedConfig ? (
            <div className="mt-5 space-y-4">
              {selectedConfig.link && (
                <>
                  <a href={selectedConfig.link} className="twa-primary-button min-h-16 w-full text-lg">
                    Добавить
                    <ChevronRight className="ml-auto h-6 w-6" />
                  </a>
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-black/20 p-3">
                    <div className="min-w-0 flex-1 break-all text-sm text-white/90">{selectedConfig.link}</div>
                    <button type="button" onClick={() => copy(selectedConfig.link)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10">
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
              {selectedConfig.conf && (
                <>
                  <textarea className="h-40 w-full rounded-2xl border border-white/15 bg-black/30 p-3 font-mono text-xs text-white" readOnly value={selectedConfig.conf} />
                  <button type="button" onClick={() => copy(selectedConfig.conf)} className="twa-primary-button min-h-14 w-full text-base">
                    Скопировать конфиг
                  </button>
                </>
              )}
              {selectedConfig.qrCode && (
                <img src={selectedConfig.qrCode} alt={`${selectedConfig.type} QR`} className="mx-auto h-48 w-48 rounded-3xl bg-white p-3" />
              )}
            </div>
          ) : (
            <div className="mt-5">
              <Link href="/account" className="twa-primary-button min-h-16 w-full text-lg">
                Активировать доступ
              </Link>
            </div>
          )}
        </section>

        <Link href="/" className="twa-ghost-button min-h-16 text-lg">
          Готово
        </Link>
      </div>
    </main>
  );
}
