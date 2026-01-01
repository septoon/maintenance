import React, { useState } from 'react';
import VirtualCardPage from './virtualCardPage';

type ProfilePageProps = {
  onClose: () => void;
};

const ProfilePage: React.FC<ProfilePageProps> = ({ onClose }) => {
  const [virtualCardOpen, setVirtualCardOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-sm dark:bg-slate-950/95">
      <div className="mx-auto flex h-full max-w-xl flex-col px-4 pb-0 pt-[calc(env(safe-area-inset-top,0)+.2rem)] sm:px-6">
        <header className="sticky top-0 z-20 -mx-4 flex items-center border-b border-slate-200/40 bg-white/40 px-4 py-2 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/35 sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-slate-900 dark:text-slate-100"
            aria-label="Вернуться назад"
          >
            <i className="pi pi-chevron-left text-lg" />
          </button>
          <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Профиль
          </h2>
        </header>

        <div className="flex-1 -mt-4 space-y-6 overflow-y-auto pb-6 pt-4">
          <section className="rounded-3xl border border-slate-900/10 bg-white/90 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/90">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <img
                  src={`${process.env.PUBLIC_URL}/profile.webp`}
                  alt="Фото профиля"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Дарчинян Тигран
                </div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Мгерович
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  главный специалист
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Основная информация
            </h3>

            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Подразделение</div>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-between rounded-2xl border border-slate-900/10 bg-white/90 p-4 text-left shadow-sm transition-colors hover:bg-white dark:border-slate-800/70 dark:bg-slate-900/90 dark:hover:bg-slate-900"
              >
                <div className="space-y-1">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    отдел развития сервиса и сопровождения POS-терминалов
                  </div>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    группа сопровождения сервиса
                  </div>
                </div>
                <i
                  className="pi pi-chevron-right text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Табельный номер</div>
                <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                  70823346
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Личный телефон</div>
                <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                  +79785068725
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Рабочая почта</div>
                <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                  DARCHINYAN@VTB.RU
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-sky-200/80 bg-sky-100/80 p-4 shadow-sm dark:border-sky-900/40 dark:bg-sky-900/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Виртуальная визитка
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Поделитесь с коллегами своими контактами
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVirtualCardOpen(true)}
                className="grid h-16 w-16 grid-cols-3 grid-rows-3 gap-1 rounded-2xl bg-white/90 p-2 shadow-inner transition hover:scale-[1.02] dark:bg-slate-900/80"
                aria-label="Открыть виртуальную визитку"
              >
                <div className="rounded-full bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-sm bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-full bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-sm bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-sm bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-sm bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-full bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-sm bg-slate-900 dark:bg-slate-100" />
                <div className="rounded-sm bg-white/10 dark:bg-slate-900/20" />
              </button>
            </div>
          </section>
        </div>

        {virtualCardOpen && (
          <VirtualCardPage onClose={() => setVirtualCardOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
