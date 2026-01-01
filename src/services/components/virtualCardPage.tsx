import React, { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';

type VirtualCardPageProps = {
  onClose: () => void;
};

type VirtualCardData = {
  firstName: string;
  lastName: string;
  middleName: string;
  title: string;
  department: string;
  phone: string;
  email: string;
  organization: string;
};

const STORAGE_KEY = 'virtual-card-data';

const DEFAULT_CARD: VirtualCardData = {
  firstName: 'Тигран',
  lastName: 'Дарчинян',
  middleName: 'Мгерович',
  title: 'главный специалист',
  department: 'группа сопровождения сервиса',
  phone: '+7 (978) 665-20-48',
  email: 'DARCHINYAN@VTB.RU',
  organization: 'ВТБ'
};

function loadStoredCard(): VirtualCardData {
  if (typeof window === 'undefined') return DEFAULT_CARD;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CARD;
  try {
    const parsed = JSON.parse(raw) as Partial<VirtualCardData>;
    return { ...DEFAULT_CARD, ...parsed };
  } catch {
    return DEFAULT_CARD;
  }
}

function buildFullName(data: VirtualCardData): string {
  return [data.lastName, data.firstName, data.middleName].filter(Boolean).join(' ');
}

function buildVCard(data: VirtualCardData): string {
  const fullName = buildFullName(data);
  const orgLine = data.organization && data.department
    ? `${data.organization};${data.department}`
    : data.organization || data.department;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${data.lastName};${data.firstName};${data.middleName};;`,
    `FN:${fullName || 'Контакт'}`,
    orgLine ? `ORG:${orgLine}` : '',
    data.title ? `TITLE:${data.title}` : '',
    data.phone ? `TEL;TYPE=CELL:${data.phone}` : '',
    data.email ? `EMAIL;TYPE=WORK:${data.email}` : '',
    'END:VCARD'
  ];

  return lines.filter(Boolean).join('\n');
}

const VirtualCardPage: React.FC<VirtualCardPageProps> = ({ onClose }) => {
  const [cardData, setCardData] = useState<VirtualCardData>(loadStoredCard);
  const [qrUrl, setQrUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const fullName = useMemo(() => buildFullName(cardData), [cardData]);
  const vcard = useMemo(() => buildVCard(cardData), [cardData]);

  useEffect(() => {
    let isActive = true;
    QRCode.toDataURL(vcard, { margin: 1, width: 260 })
      .then((url: string) => {
        if (isActive) setQrUrl(url);
      })
      .catch(() => {
        if (isActive) setQrUrl('');
      });
    return () => {
      isActive = false;
    };
  }, [vcard]);

  const handleChange = (field: keyof VirtualCardData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCardData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cardData));
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white">
      <div className="mx-auto flex h-full max-w-xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0)+1.5rem)] pt-[calc(env(safe-area-inset-top,0)+.2rem)] sm:px-6">
        <header className="relative flex items-center py-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-white"
            aria-label="Вернуться назад"
          >
            <i className="pi pi-chevron-left text-lg" />
          </button>
          <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-semibold text-white">
            Виртуальная визитка
          </h2>
        </header>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pb-6">
          <section className="flex flex-col items-center gap-4">
            <div className="rounded-3xl bg-white p-4 shadow-xl">
              {qrUrl ? (
                <img src={qrUrl} alt="QR-код визитки" className="h-60 w-60" />
              ) : (
                <div className="flex h-60 w-60 items-center justify-center text-sm text-slate-500">
                  QR-код недоступен
                </div>
              )}
            </div>
            <p className="max-w-sm text-center text-sm text-slate-400">
              Дайте отсканировать этот QR-код тому, с кем хотите поделиться контактами.
            </p>
          </section>

          <section className="rounded-3xl bg-slate-900/90 p-5 shadow-lg">
            <div className="text-lg font-semibold text-white">{fullName}</div>

            {!isEditing && (
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Должность
                  </div>
                  <div className="mt-1 text-base text-white">{cardData.title}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Подразделение
                  </div>
                  <div className="mt-1 text-base text-white">{cardData.department}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Личный телефон
                  </div>
                  <div className="mt-1 text-base text-white">{cardData.phone}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Рабочая почта
                  </div>
                  <div className="mt-1 text-base text-white">{cardData.email}</div>
                </div>
              </div>
            )}

            {isEditing && (
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Фамилия
                    </span>
                    <input
                      value={cardData.lastName}
                      onChange={handleChange('lastName')}
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Имя
                    </span>
                    <input
                      value={cardData.firstName}
                      onChange={handleChange('firstName')}
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                    />
                  </label>
                </div>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Отчество
                  </span>
                  <input
                    value={cardData.middleName}
                    onChange={handleChange('middleName')}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Организация
                  </span>
                  <input
                    value={cardData.organization}
                    onChange={handleChange('organization')}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Должность
                  </span>
                  <input
                    value={cardData.title}
                    onChange={handleChange('title')}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Подразделение
                  </span>
                  <input
                    value={cardData.department}
                    onChange={handleChange('department')}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Личный телефон
                  </span>
                  <input
                    value={cardData.phone}
                    onChange={handleChange('phone')}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Рабочая почта
                  </span>
                  <input
                    value={cardData.email}
                    onChange={handleChange('email')}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white"
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              className="mt-6 w-full rounded-2xl bg-slate-800/90 px-4 py-3 text-center text-base font-semibold text-white shadow-inner transition hover:bg-slate-800"
            >
              {isEditing ? 'Сохранить визитку' : 'Настроить визитку'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default VirtualCardPage;
