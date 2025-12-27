import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSalaryMonths } from '../salaryApi';
import { SalaryMonth } from '../../types';

type SalaryPageProps = {
  onClose: () => void;
};

const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь'
];
const MONTH_LABELS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря'
];
const TAX_RATE = 0.13;

function formatMonthLabel(value: string): string {
  const [year, month] = value.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value || 'Без даты';
  }

  return `${MONTH_LABELS[monthIndex]} ${year}`;
}

function formatEntryDate(value: string): string {
  const [year, month, day] = value.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || !day || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value || 'Без даты';
  }

  return `${Number(day)} ${MONTH_LABELS_GENITIVE[monthIndex]}`;
}

function formatCurrency(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits
  });
}

function formatRubles(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

const SalaryPage: React.FC<SalaryPageProps> = ({ onClose }) => {
  const [months, setMonths] = useState<SalaryMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const apiIsConfigured = Boolean(process.env.REACT_APP_API_SALARY);

  const loadSalary = useCallback(async () => {
    if (!apiIsConfigured) {
      setMonths([]);
      setError('Добавьте REACT_APP_API_SALARY в .env перед использованием раздела зарплаты.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchSalaryMonths();
      setMonths(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось получить данные зарплаты.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiIsConfigured]);

  useEffect(() => {
    loadSalary();
  }, [loadSalary]);

  const orderedMonths = useMemo(
    () => [...months].sort((a, b) => a.month.localeCompare(b.month)),
    [months]
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-sm dark:bg-slate-950/95">
      <div className="mx-auto flex h-full max-w-xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0)+1.5rem)] pt-[calc(env(safe-area-inset-top,0)+1.5rem)] sm:px-6">
        <header className="relative flex items-center py-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-slate-900 dark:text-slate-100"
            aria-label="Вернуться назад"
          >
            <i className="pi pi-chevron-left text-lg" />
          </button>
          <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Зарплата
          </h2>
        </header>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-6">
          {!apiIsConfigured && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
              Укажите адрес сервера в .env (REACT_APP_API_SALARY).
            </div>
          )}

          {apiIsConfigured && error && (
            <div className="rounded-2xl border border-red-400/45 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {apiIsConfigured && loading && months.length === 0 && !error && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
              Загружаем данные по зарплате…
            </div>
          )}

          {apiIsConfigured && !loading && !error && orderedMonths.length === 0 && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
              Пока нет данных по зарплате.
            </div>
          )}

          {apiIsConfigured && !error && orderedMonths.length > 0 && (
            <ul className="space-y-3">
              {orderedMonths.map(month => {
                const isExpanded = expandedMonth === month.month;
                const sortedEntries = [...month.entries].sort((a, b) =>
                  a.date.localeCompare(b.date)
                );
                const totalBase = sortedEntries.reduce(
                  (acc, entry) => acc + entry.baseSalary,
                  0
                );
                const totalWeekend = sortedEntries.reduce(
                  (acc, entry) => acc + entry.weekendPay,
                  0
                );
                const totalTax = sortedEntries.reduce(
                  (acc, entry) => acc + Math.floor(entry.baseSalary * TAX_RATE),
                  0
                );
                const totalNet = sortedEntries.reduce((acc, entry) => {
                  const tax = Math.floor(entry.baseSalary * TAX_RATE);
                  return acc + entry.baseSalary - tax + entry.weekendPay;
                }, 0);
                const totalGross = totalBase + totalWeekend;
                return (
                  <li
                    key={month.month}
                    className="rounded-2xl border border-slate-900/10 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/80"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMonth(isExpanded ? null : month.month)
                      }
                      className="flex w-full items-center justify-between text-left"
                      aria-expanded={isExpanded}
                    >
                      <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {formatMonthLabel(month.month)}
                      </span>
                      <i
                        className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-slate-600 dark:text-slate-300`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        {sortedEntries.map(entry => {
                          const tax = Math.floor(entry.baseSalary * TAX_RATE);
                          const payout = entry.baseSalary - tax + entry.weekendPay;
                          const weekendPart = entry.weekendPay / 2;
                          return (
                            <div
                              key={`${month.month}-${entry.date}`}
                              className="rounded-3xl border border-slate-900/10 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/90"
                            >
                              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                {formatEntryDate(entry.date)}
                              </div>
                              <dl className="mt-3 space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 shadow-inner dark:border-slate-800/60 dark:bg-slate-800/70 dark:text-slate-200">
                                <div className="flex items-center justify-between">
                                  <dt className="font-medium text-slate-900 dark:text-slate-100">
                                    Оклад
                                  </dt>
                                  <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(entry.baseSalary)} ₽
                                  </dd>
                                </div>
                                {entry.weekendPay > 0 && (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <dt className="max-w-[65%] font-medium text-slate-900 dark:text-slate-100">
                                        Оплата за работу в выходной/ праздничный день
                                      </dt>
                                      <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                        {formatCurrency(weekendPart)} ₽
                                      </dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <dt className="max-w-[65%] font-medium text-slate-900 dark:text-slate-100">
                                        Доплата за работу в выходной/ праздничный день
                                      </dt>
                                      <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                        {formatCurrency(weekendPart)} ₽
                                      </dd>
                                    </div>
                                  </>
                                )}
                                <div className="flex items-center justify-between">
                                  <dt className="max-w-[65%] font-medium text-slate-900 dark:text-slate-100">
                                    Налог на доходы физических лиц
                                  </dt>
                                  <dd className="text-base font-semibold text-rose-500 dark:text-rose-400">
                                    - {formatRubles(tax)} ₽
                                  </dd>
                                </div>
                                <div className="h-px bg-slate-200/80 dark:bg-slate-700/70" />
                                <div className="flex items-center justify-between">
                                  <dt className="font-medium text-slate-900 dark:text-slate-100">
                                    Выплата
                                  </dt>
                                  <dd className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(payout)} ₽
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          );
                        })}

                        <div className="rounded-3xl border border-slate-900/10 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/90">
                          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Итог
                          </div>
                          <dl className="mt-3 space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 shadow-inner dark:border-slate-800/60 dark:bg-slate-800/70 dark:text-slate-200">
                            <div className="flex items-center justify-between">
                              <dt className="font-medium text-slate-900 dark:text-slate-100">
                                Начислено
                              </dt>
                              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                {formatCurrency(totalGross)} ₽
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="font-medium text-slate-900 dark:text-slate-100">
                                Удержано
                              </dt>
                              <dd className="text-base font-semibold text-rose-500 dark:text-rose-400">
                                - {formatRubles(totalTax)} ₽
                              </dd>
                            </div>
                            <div className="h-px bg-slate-200/80 dark:bg-slate-700/70" />
                            <div className="flex items-center justify-between">
                              <dt className="font-medium text-slate-900 dark:text-slate-100">
                                Перечислено
                              </dt>
                              <dd className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(totalNet)} ₽
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryPage;
