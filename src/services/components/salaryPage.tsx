import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import {
  createSalaryEntry,
  deleteSalaryEntry,
  fetchSalaryMonths,
  updateSalaryEntry
} from '../salaryApi';
import { SalaryEntry, SalaryMonth } from '../../types';

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
const initialSalaryFormState = {
  date: '',
  baseSalary: '',
  weekendPay: ''
};

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

function formatMonthCount(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'месяц';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'месяца';
  }
  return 'месяцев';
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

function calculateWeekendPart(weekendPay: number): number {
  return weekendPay / 2;
}

function calculateTax(entry: SalaryEntry): number {
  return Math.floor((entry.baseSalary + entry.weekendPay) * TAX_RATE);
}

function calculatePayout(entry: SalaryEntry): number {
  return entry.baseSalary + entry.weekendPay - calculateTax(entry);
}

const SalaryPage: React.FC<SalaryPageProps> = ({ onClose }) => {
  const [months, setMonths] = useState<SalaryMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAmountHidden, setIsAmountHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SALARY_VISIBILITY_KEY) === 'true';
  });
  const [showAllTime, setShowAllTime] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState(initialSalaryFormState);
  const [salarySubmitting, setSalarySubmitting] = useState(false);
  const [salaryFormError, setSalaryFormError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<SalaryEntry | null>(null);
  const [salaryActionNotice, setSalaryActionNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!salaryActionNotice) return;

    const timer = setTimeout(() => setSalaryActionNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [salaryActionNotice]);

  const handleSalaryFormChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setSalaryForm(prev => ({ ...prev, [name]: value }));
  };

  const openCreateSalaryDialog = () => {
    setEditingEntry(null);
    setSalaryForm(initialSalaryFormState);
    setSalaryFormError(null);
    setSalaryDialogOpen(true);
  };

  const openEditSalaryDialog = (entry: SalaryEntry) => {
    setEditingEntry(entry);
    setSalaryForm({
      date: entry.date,
      baseSalary: String(entry.baseSalary),
      weekendPay: entry.weekendPay ? String(entry.weekendPay) : ''
    });
    setSalaryFormError(null);
    setSalaryDialogOpen(true);
  };

  const openSalaryDatePicker = (
    event: React.MouseEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  const handleSalarySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiIsConfigured) {
      setSalaryFormError('Добавьте REACT_APP_API_SALARY в .env перед использованием раздела зарплаты.');
      return;
    }

    const date = salaryForm.date.trim();
    const baseSalaryRaw = salaryForm.baseSalary.trim().replace(',', '.');
    const weekendPayRaw = salaryForm.weekendPay.trim().replace(',', '.');

    if (!date || !baseSalaryRaw) {
      setSalaryFormError('Заполните дату и оклад.');
      return;
    }

    const baseSalary = Number(baseSalaryRaw);
    const weekendPay = weekendPayRaw ? Number(weekendPayRaw) : 0;

    if (Number.isNaN(baseSalary) || baseSalary < 0) {
      setSalaryFormError('Оклад должен быть неотрицательным числом.');
      return;
    }

    if (Number.isNaN(weekendPay) || weekendPay < 0) {
      setSalaryFormError('Оплата в выходной должна быть неотрицательным числом.');
      return;
    }

    try {
      setSalarySubmitting(true);
      setSalaryFormError(null);
      if (editingEntry) {
        await updateSalaryEntry(editingEntry, {
          date,
          baseSalary,
          weekendPay
        });
      } else {
        await createSalaryEntry({
          date,
          baseSalary,
          weekendPay
        });
      }
      await loadSalary();
      setSalaryForm(initialSalaryFormState);
      setSalaryDialogOpen(false);
      setEditingEntry(null);
      setSalaryActionNotice(
        editingEntry ? 'Запись зарплаты обновлена.' : 'Запись зарплаты добавлена.'
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось сохранить запись зарплаты.';
      setSalaryFormError(message);
    } finally {
      setSalarySubmitting(false);
    }
  };

  const handleSalaryDelete = async (entry: SalaryEntry) => {
    const confirmed = window.confirm('Удалить запись по зарплате?');
    if (!confirmed) return;

    try {
      setError(null);
      await deleteSalaryEntry(entry);
      await loadSalary();
      setSalaryActionNotice('Запись зарплаты удалена.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось удалить запись зарплаты.';
      setError(message);
    }
  };

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
    const totalNet = sortedEntries.reduce(
      (acc, entry) => acc + calculatePayout(entry),
      0
    );

    let amount = totalNet;
    let periodEnd = periodStart;

    if (sortedEntries.length === 1) {
      const entry = sortedEntries[0];
      amount = calculatePayout(entry);
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

  const allTimeSummary = useMemo(() => {
    if (orderedMonths.length === 0) return null;
    const entries = orderedMonths.flatMap(month => month.entries);
    if (entries.length === 0) return null;
    const dates = entries
      .map(entry => entry.date)
      .filter(date => Boolean(date))
      .sort((a, b) => a.localeCompare(b));
    if (dates.length === 0) return null;

    const totalNet = entries.reduce(
      (acc, entry) => acc + calculatePayout(entry),
      0
    );

    return {
      monthLabel: `${orderedMonths.length} ${formatMonthCount(orderedMonths.length)}`,
      periodLabel: `${formatDateShort(dates[0])} - ${formatDateShort(
        dates[dates.length - 1]
      )}`,
      amount: totalNet
    };
  }, [orderedMonths]);

  const activeSummary = showAllTime ? allTimeSummary ?? latestSummary : latestSummary;

  const displayAmount = activeSummary
    ? isAmountHidden
      ? `${formatCurrency(activeSummary.amount).replace(/\S/g, '*')} ₽`
      : `${formatCurrency(activeSummary.amount)} ₽`
    : '';
  const fieldClasses =
    'w-full rounded-2xl border border-slate-900/10 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-1 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-400/60 dark:focus:ring-offset-slate-900';
  const primaryButtonClass =
    'inline-flex items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-button transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none active:translate-y-0 active:shadow-buttonActive dark:from-blue-500 dark:to-blue-400';
  const dialogStyle = { width: '100%', maxWidth: '480px', margin: '0 auto' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex h-full max-w-xl flex-col px-4 pb-0 pt-[calc(env(safe-area-inset-top,0)+.2rem)] sm:px-6">
        <header className="sticky top-0 z-20 -mx-4 flex items-center bg-white/40 px-4 py-2 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/35 sm:-mx-6 sm:px-6">
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

        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pb-24">
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

          {apiIsConfigured && salaryActionNotice && (
            <div className="rounded-2xl border border-emerald-300/70 bg-emerald-100/80 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-100">
              {salaryActionNotice}
            </div>
          )}

          {apiIsConfigured && loading && months.length === 0 && !error && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
              Загружаем данные по зарплате…
            </div>
          )}

          {apiIsConfigured && !loading && !error && !activeSummary && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
              Пока нет данных по зарплате.
            </div>
          )}

          {apiIsConfigured && !error && activeSummary && (
            <section className="rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-600 to-blue-500 p-5 shadow-[0_18px_45px_rgba(37,99,235,0.4)]">
              <div className="text-sm font-semibold text-white/80">
                Перечислено за {activeSummary.monthLabel}
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
                Период начисления {activeSummary.periodLabel}
              </div>
              <button
                type="button"
                onClick={() => setShowAllTime(prev => !prev)}
                className="mt-4 w-full rounded-2xl bg-slate-900/30 px-4 py-3 text-center text-base font-semibold text-white/90 shadow-inner transition hover:bg-slate-900/40"
              >
                {showAllTime ? 'За последний месяц' : 'За все время'}
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
                    (acc, entry) => acc + calculateTax(entry),
                    0
                  );
                  const totalNet = sortedEntries.reduce(
                    (acc, entry) => acc + calculatePayout(entry),
                    0
                  );
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
                          {sortedEntries.map((entry, entryIndex) => {
                            const tax = calculateTax(entry);
                            const payout = calculatePayout(entry);
                            const weekendPart = calculateWeekendPart(entry.weekendPay);
                            return (
                              <div
                                key={
                                  entry.id ??
                                  `${month.month}-${entry.date}-${entry.baseSalary}-${entry.weekendPay}-${entryIndex}`
                                }
                                className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-900/80"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {formatEntryDate(entry.date)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditSalaryDialog(entry)}
                                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300/80 bg-white/80 text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-white/15 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
                                      aria-label="Редактировать запись зарплаты"
                                    >
                                      <i className="pi pi-pencil text-sm" aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSalaryDelete(entry)}
                                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/80 bg-rose-50/80 text-rose-700 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                                      aria-label="Удалить запись зарплаты"
                                    >
                                      <i className="pi pi-trash text-sm" aria-hidden="true" />
                                    </button>
                                  </div>
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

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] z-30 mx-auto w-full max-w-xl px-4 sm:px-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreateSalaryDialog}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-[0_12px_30px_rgba(37,99,235,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(37,99,235,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Добавить запись зарплаты"
          >
            <i className="pi pi-plus text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Dialog
        header={editingEntry ? 'Редактировать запись зарплаты' : 'Добавить запись зарплаты'}
        visible={salaryDialogOpen}
        position="bottom"
        modal
        onHide={() => {
          setSalaryDialogOpen(false);
          setEditingEntry(null);
          setSalaryFormError(null);
        }}
        style={dialogStyle}
        className="p-0"
        headerClassName="bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-slate-100"
        contentClassName="bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-slate-100"
      >
        <form className="mb-4 flex flex-col gap-4" onSubmit={handleSalarySubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Дата выплаты
            <input
              type="date"
              name="date"
              value={salaryForm.date}
              onChange={handleSalaryFormChange}
              onClick={openSalaryDatePicker}
              required
              disabled={salarySubmitting || !apiIsConfigured}
              className={fieldClasses}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Оклад
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="baseSalary"
              value={salaryForm.baseSalary}
              onChange={handleSalaryFormChange}
              required
              disabled={salarySubmitting || !apiIsConfigured}
              className={fieldClasses}
              placeholder="0.00"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Оплата в выходной (опционально)
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="weekendPay"
              value={salaryForm.weekendPay}
              onChange={handleSalaryFormChange}
              disabled={salarySubmitting || !apiIsConfigured}
              className={fieldClasses}
              placeholder="0.00"
            />
          </label>

          <button
            className={primaryButtonClass}
            type="submit"
            disabled={salarySubmitting || !apiIsConfigured}
          >
            {salarySubmitting ? 'Сохраняем…' : editingEntry ? 'Сохранить изменения' : 'Добавить запись'}
          </button>
        </form>

        {salaryFormError && (
          <div className="mt-4 rounded-2xl border border-red-400/45 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200">
            {salaryFormError}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default SalaryPage;
