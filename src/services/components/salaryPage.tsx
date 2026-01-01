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
const SALARY_VISIBILITY_KEY = 'salary-amount-hidden';

function formatMonthLabel(value: string): string {
  const [year, month] = value.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value || 'Без даты';
  }

  return `${MONTH_LABELS[monthIndex]} ${year}`;
}

function formatMonthName(value: string): string {
  const [, month] = value.split('-');
  const monthIndex = Number(month) - 1;
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value || 'Без даты';
  }

  return MONTH_LABELS[monthIndex];
}

function formatEntryDate(value: string): string {
  const [year, month, day] = value.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || !day || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value || 'Без даты';
  }

  return `${Number(day)} ${MONTH_LABELS_GENITIVE[monthIndex]}`;
}

function formatDateShort(value: string): string {
  const [year, month, dayRaw] = value.split('-');
  const day = dayRaw ? dayRaw.slice(0, 2) : '';
  if (!year || !month || !day) {
    return value || 'Без даты';
  }

  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
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
  const [isAmountHidden, setIsAmountHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SALARY_VISIBILITY_KEY) === 'true';
  });
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SALARY_VISIBILITY_KEY, String(isAmountHidden));
  }, [isAmountHidden]);

  const orderedMonths = useMemo(
    () => [...months].sort((a, b) => a.month.localeCompare(b.month)),
    [months]
  );

  const years = useMemo(() => {
    const unique: Record<string, true> = {};
    orderedMonths.forEach(month => {
      const year = month.month.split('-')[0];
      if (year) {
        unique[year] = true;
      }
    });
    return Object.keys(unique).sort((a, b) => Number(b) - Number(a));
  }, [orderedMonths]);

  useEffect(() => {
    if (years.length === 0) {
      setSelectedYear(null);
      return;
    }
    setSelectedYear(prev => (prev && years.includes(prev) ? prev : years[0]));
  }, [years]);

  const yearMonths = useMemo(() => {
    if (!selectedYear) return [];
    return [...orderedMonths]
      .filter(month => month.month.startsWith(`${selectedYear}-`))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [orderedMonths, selectedYear]);

  const latestSummary = useMemo(() => {
    const latestMonth = orderedMonths[orderedMonths.length - 1];
    if (!latestMonth || latestMonth.entries.length === 0) return null;

    const sortedEntries = [...latestMonth.entries].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const [year, month] = latestMonth.month.split('-');
    const monthIndex = Number(month) - 1;
    if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return null;
    }

    const monthNumber = String(monthIndex + 1).padStart(2, '0');
    const periodStart = `01.${monthNumber}.${year}`;
    const totalNet = sortedEntries.reduce((acc, entry) => {
      const tax = Math.floor(entry.baseSalary * TAX_RATE);
      return acc + entry.baseSalary - tax + entry.weekendPay;
    }, 0);

    let amount = totalNet;
    let periodEnd = periodStart;

    if (sortedEntries.length === 1) {
      const entry = sortedEntries[0];
      const tax = Math.floor(entry.baseSalary * TAX_RATE);
      amount = entry.baseSalary - tax + entry.weekendPay;
      periodEnd = formatDateShort(entry.date);
    } else {
      const lastDay = new Date(Number(year), monthIndex + 1, 0).getDate();
      periodEnd = `${String(lastDay).padStart(2, '0')}.${monthNumber}.${year}`;
    }

    return {
      monthLabel: formatMonthLabel(latestMonth.month),
      periodLabel: `${periodStart} - ${periodEnd}`,
      amount
    };
  }, [orderedMonths]);

  const displayAmount = latestSummary
    ? isAmountHidden
      ? `${formatCurrency(latestSummary.amount).replace(/\S/g, '*')} ₽`
      : `${formatCurrency(latestSummary.amount)} ₽`
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex h-full max-w-xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0)+1.5rem)] pt-[calc(env(safe-area-inset-top,0)+.2rem)] sm:px-6">
        <header className="relative flex items-center py-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-slate-900 dark:text-white"
            aria-label="Вернуться назад"
          >
            <i className="pi pi-chevron-left text-lg" />
          </button>
          <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-slate-900 dark:text-white">
            Зарплата
          </h2>
        </header>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pb-6">
          {!apiIsConfigured && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
              Укажите адрес сервера в .env (REACT_APP_API_SALARY).
            </div>
          )}

          {apiIsConfigured && error && (
            <div className="rounded-2xl border border-rose-300/60 bg-rose-100/80 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-100">
              {error}
            </div>
          )}

          {apiIsConfigured && loading && months.length === 0 && !error && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
              Загружаем данные по зарплате…
            </div>
          )}

          {apiIsConfigured && !loading && !error && !latestSummary && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
              Пока нет данных по зарплате.
            </div>
          )}

          {apiIsConfigured && !error && latestSummary && (
            <section className="rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-600 to-blue-500 p-5 shadow-[0_18px_45px_rgba(37,99,235,0.4)]">
              <div className="text-sm font-semibold text-white/80">
                Перечислено за {latestSummary.monthLabel}
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-white/80">
                <div className="text-4xl font-semibold tracking-tight">
                  {displayAmount}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAmountHidden(prev => !prev)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-pressed={isAmountHidden}
                  aria-label={
                    isAmountHidden ? 'Показать сумму' : 'Скрыть сумму'
                  }
                >
                  <i
                    className={`pi ${isAmountHidden ? 'pi-eye-slash' : 'pi-eye'} text-lg`}
                  />
                </button>
              </div>
              <div className="mt-2 text-sm text-blue-100">
                Период начисления {latestSummary.periodLabel}
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-2xl bg-slate-900/30 px-4 py-3 text-center text-base font-semibold text-white/90 shadow-inner transition hover:bg-slate-900/40"
              >
                Подробнее
              </button>
            </section>
          )}

          {apiIsConfigured && !error && orderedMonths.length > 0 && (
            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-lg dark:border-white/10 dark:bg-slate-900/85">
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                Все периоды
              </div>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {years.map(year => {
                  const isActive = year === selectedYear;
                  return (
                    <button
                      type="button"
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {yearMonths.length === 0 && selectedYear && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Нет данных за {selectedYear}.
                  </div>
                )}
                {yearMonths.map(month => {
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
                    <div
                      key={month.month}
                      className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-4 text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-800/80 dark:text-white"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMonth(isExpanded ? null : month.month)
                        }
                        className="flex w-full items-center justify-between text-left"
                        aria-expanded={isExpanded}
                      >
                        <span className="text-base font-medium">
                          {formatMonthName(month.month)}
                        </span>
                        <i
                          className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-slate-400`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          {sortedEntries.map(entry => {
                            const tax = Math.floor(entry.baseSalary * TAX_RATE);
                            const payout = entry.baseSalary - tax + entry.weekendPay;
                            const weekendPart = entry.weekendPay / 2;
                            return (
                              <div
                                key={`${month.month}-${entry.date}`}
                                className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-900/80"
                              >
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {formatEntryDate(entry.date)}
                                </div>
                                <dl className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-200">
                                  <div className="flex items-center justify-between">
                                    <dt className="text-slate-500 dark:text-slate-300">
                                      Оклад
                                    </dt>
                                    <dd className="font-semibold text-slate-900 dark:text-white">
                                      {formatCurrency(entry.baseSalary)} ₽
                                    </dd>
                                  </div>
                                  {entry.weekendPay > 0 && (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <dt className="max-w-[65%] text-slate-500 dark:text-slate-300">
                                          Оплата за работу в выходной/ праздничный
                                          день
                                        </dt>
                                        <dd className="font-semibold text-slate-900 dark:text-white">
                                          {formatCurrency(weekendPart)} ₽
                                        </dd>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <dt className="max-w-[65%] text-slate-500 dark:text-slate-300">
                                          Доплата за работу в выходной/ праздничный
                                          день
                                        </dt>
                                        <dd className="font-semibold text-slate-900 dark:text-white">
                                          {formatCurrency(weekendPart)} ₽
                                        </dd>
                                      </div>
                                    </>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <dt className="max-w-[65%] text-slate-500 dark:text-slate-300">
                                      Налог на доходы физических лиц
                                    </dt>
                                    <dd className="font-semibold text-rose-500 dark:text-rose-300">
                                      - {formatRubles(tax)} ₽
                                    </dd>
                                  </div>
                                  <div className="h-px bg-slate-200/80 dark:bg-white/10" />
                                  <div className="flex items-center justify-between">
                                    <dt className="text-slate-700 dark:text-slate-200">
                                      Выплата
                                    </dt>
                                    <dd className="font-semibold text-emerald-600 dark:text-emerald-300">
                                      {formatCurrency(payout)} ₽
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            );
                          })}

                          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-900/80">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              Итог
                            </div>
                            <dl className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-200">
                              <div className="flex items-center justify-between">
                                <dt className="text-slate-500 dark:text-slate-300">
                                  Начислено
                                </dt>
                                <dd className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(totalGross)} ₽
                                </dd>
                              </div>
                              <div className="flex items-center justify-between">
                                <dt className="text-slate-500 dark:text-slate-300">
                                  Удержано
                                </dt>
                                <dd className="font-semibold text-rose-500 dark:text-rose-300">
                                  - {formatRubles(totalTax)} ₽
                                </dd>
                              </div>
                              <div className="h-px bg-slate-200/80 dark:bg-white/10" />
                              <div className="flex items-center justify-between">
                                <dt className="text-slate-700 dark:text-slate-200">
                                  Перечислено
                                </dt>
                                <dd className="font-semibold text-emerald-600 dark:text-emerald-300">
                                  {formatCurrency(totalNet)} ₽
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryPage;
