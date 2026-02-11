import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import {
  createFuelRecord,
  deleteFuelRecord,
  fetchFuelRecords,
  updateFuelRecord
} from '../fuelApi';
import { FuelRecord } from '../../types';
import FuelSection from './fuelSection';

type FuelPageProps = {
  onClose: () => void;
};

const FUEL_CONSUMPTION_RATE = 9.4;
const FUEL_CONSUMPTION_RATE_INCREASE = 0.07;
const FUEL_CONSUMPTION_RATE_DATES = new Set([
  '2025-12-31',
  '2026-01-31',
  '2026-02-28',
  '2026-03-31'
]);
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
const initialFuelFormState = {
  date: '',
  mileage: '',
  liters: '',
  fuelCost: ''
};

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}

function normalizeDate(value?: string): string {
  return value ? value.trim().slice(0, 10) : '';
}

function formatDisplayDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function getMonthInfo(date?: string): { key: string; label: string } | null {
  const normalized = normalizeDate(date);
  if (!normalized) return null;

  const [year, month] = normalized.split('-');
  const monthIndex = Number(month) - 1;

  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  return {
    key: `${year}-${month}`,
    label: `${MONTH_LABELS[monthIndex]} ${year}`
  };
}

function getFuelConsumptionRate(date?: string): number {
  const normalizedDate = normalizeDate(date);

  if (normalizedDate && FUEL_CONSUMPTION_RATE_DATES.has(normalizedDate)) {
    return FUEL_CONSUMPTION_RATE * (1 + FUEL_CONSUMPTION_RATE_INCREASE);
  }

  return FUEL_CONSUMPTION_RATE;
}

const FuelPage: React.FC<FuelPageProps> = ({ onClose }) => {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState(initialFuelFormState);
  const [fuelSubmitting, setFuelSubmitting] = useState(false);
  const [fuelFormError, setFuelFormError] = useState<string | null>(null);
  const [editingFuelRecord, setEditingFuelRecord] = useState<FuelRecord | null>(null);
  const [fuelActionNotice, setFuelActionNotice] = useState<string | null>(null);

  const gasApiIsConfigured = Boolean(process.env.REACT_APP_API_GAS);

  const loadFuelRecords = useCallback(async () => {
    if (!gasApiIsConfigured) {
      setFuelLoading(false);
      setFuelRecords([]);
      setFuelError('Добавьте REACT_APP_API_GAS в .env перед использованием расчёта топлива.');
      return;
    }

    try {
      setFuelLoading(true);
      setFuelError(null);
      const data = await fetchFuelRecords();
      setFuelRecords(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить данные топлива.';
      setFuelError(message);
    } finally {
      setFuelLoading(false);
    }
  }, [gasApiIsConfigured]);

  useEffect(() => {
    loadFuelRecords();
  }, [loadFuelRecords]);

  useEffect(() => {
    if (!fuelActionNotice) return;

    const timer = setTimeout(() => setFuelActionNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [fuelActionNotice]);

  const handleFuelFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFuelForm(prev => ({ ...prev, [name]: value }));
  };

  const openCreateFuelDialog = () => {
    setEditingFuelRecord(null);
    setFuelForm(initialFuelFormState);
    setFuelFormError(null);
    setFuelDialogOpen(true);
  };

  const openEditFuelDialog = (record: FuelRecord) => {
    setEditingFuelRecord(record);
    setFuelForm({
      date: record.date ?? '',
      mileage: record.mileage !== null && record.mileage !== undefined ? String(record.mileage) : '',
      liters: record.liters !== null && record.liters !== undefined ? String(record.liters) : '',
      fuelCost:
        record.fuelCost !== null && record.fuelCost !== undefined
          ? String(record.fuelCost)
          : ''
    });
    setFuelFormError(null);
    setFuelDialogOpen(true);
  };

  const openFuelDatePicker = (event: React.MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  const handleFuelSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!gasApiIsConfigured) {
      setFuelFormError('Добавьте REACT_APP_API_GAS в .env перед использованием расчёта топлива.');
      return;
    }

    const date = fuelForm.date.trim();
    const mileageRaw = fuelForm.mileage.trim().replace(',', '.');
    const litersRaw = fuelForm.liters.trim().replace(',', '.');
    const fuelCostRaw = fuelForm.fuelCost.trim().replace(',', '.');

    if (!date) {
      setFuelFormError('Укажите дату.');
      return;
    }

    if (!mileageRaw && !litersRaw && !fuelCostRaw) {
      setFuelFormError('Укажите хотя бы одно значение: пробег, литры или сумму.');
      return;
    }

    const mileage = mileageRaw ? Number(mileageRaw) : null;
    const liters = litersRaw ? Number(litersRaw) : null;
    const fuelCost = fuelCostRaw ? Number(fuelCostRaw) : null;

    if (mileage !== null && (Number.isNaN(mileage) || mileage < 0)) {
      setFuelFormError('Пробег должен быть неотрицательным числом.');
      return;
    }

    if (liters !== null && (Number.isNaN(liters) || liters < 0)) {
      setFuelFormError('Литры должны быть неотрицательным числом.');
      return;
    }

    if (fuelCost !== null && (Number.isNaN(fuelCost) || fuelCost < 0)) {
      setFuelFormError('Сумма должна быть неотрицательным числом.');
      return;
    }

    try {
      setFuelSubmitting(true);
      setFuelFormError(null);
      if (editingFuelRecord) {
        await updateFuelRecord(editingFuelRecord, {
          date,
          mileage,
          liters,
          fuelCost
        });
      } else {
        await createFuelRecord({
          date,
          mileage,
          liters,
          fuelCost
        });
      }
      await loadFuelRecords();
      setFuelForm(initialFuelFormState);
      setFuelDialogOpen(false);
      setEditingFuelRecord(null);
      setFuelActionNotice(
        editingFuelRecord ? 'Запись топлива обновлена.' : 'Запись топлива добавлена.'
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось сохранить данные топлива.';
      setFuelFormError(message);
    } finally {
      setFuelSubmitting(false);
    }
  };

  const handleFuelDelete = async (record: FuelRecord) => {
    const confirmed = window.confirm('Удалить запись топлива?');
    if (!confirmed) return;

    try {
      setFuelError(null);
      await deleteFuelRecord(record);
      await loadFuelRecords();
      setFuelActionNotice('Запись топлива удалена.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось удалить запись топлива.';
      setFuelError(message);
    }
  };

  const orderedFuelRecords = useMemo(
    () =>
      [...fuelRecords].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? 1 : -1;
      }),
    [fuelRecords]
  );

  const fuelSummary = useMemo(() => {
    if (!gasApiIsConfigured || fuelRecords.length === 0) {
      return {
        monthly: [],
        totals: {
          totalMileage: 0,
          totalLiters: 0,
          fuelNorm: 0,
          totalFuelCost: 0,
          totalCompensation: 0,
          fuelDiff: 0,
          diffLabel: ''
        },
        explanation: '',
        hasData: false
      };
    }

    const orderedFuelRecords = [...fuelRecords].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date < b.date ? -1 : 1;
    });

    const monthlyMap = new Map<
      string,
      {
        key: string;
        sortKey: string;
        label: string;
        totalMileage: number;
        totalLiters: number;
        fuelNorm: number;
        fuelCost: number;
      }
    >();

    orderedFuelRecords.forEach(item => {
      const monthInfo = getMonthInfo(item.date);
      const key = monthInfo?.key ?? 'unknown';
      const sortKey = monthInfo?.key ?? '9999-99';
      const label = monthInfo?.label ?? 'Без даты';
      const mileage = item.mileage ?? 0;
      const liters = item.liters ?? 0;
      const fuelCost = item.fuelCost ?? 0;
      const fuelNorm = mileage > 0 ? (mileage * getFuelConsumptionRate(item.date)) / 100 : 0;
      const existing = monthlyMap.get(key) ?? {
        key,
        sortKey,
        label,
        totalMileage: 0,
        totalLiters: 0,
        fuelNorm: 0,
        fuelCost: 0
      };

      existing.totalMileage += mileage;
      existing.totalLiters += liters;
      existing.fuelNorm += fuelNorm;
      existing.fuelCost += fuelCost;
      monthlyMap.set(key, existing);
    });

    const monthly = Array.from(monthlyMap.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(month => {
        const fuelDiff = month.fuelNorm - month.totalLiters;
        const diffSign = fuelDiff > 0 ? '+' : fuelDiff < 0 ? '-' : '';
        const diffLabel = `${diffSign}${formatNumber(Math.abs(fuelDiff))} л`;
        const approvedRate =
          month.totalMileage > 0 ? (month.fuelNorm / month.totalMileage) * 100 : 0;
        const compensation = month.totalMileage * 5;
        return {
          ...month,
          fuelDiff,
          diffLabel,
          approvedRate,
          compensation
        };
      });

    const totalMileage = monthly.reduce((acc, item) => acc + item.totalMileage, 0);
    const totalLiters = monthly.reduce((acc, item) => acc + item.totalLiters, 0);
    const fuelNorm = monthly.reduce((acc, item) => acc + item.fuelNorm, 0);
    const totalFuelCost = monthly.reduce((acc, item) => acc + item.fuelCost, 0);
    const totalCompensation = monthly.reduce((acc, item) => acc + item.compensation, 0);
    const fuelDiff = fuelNorm - totalLiters;
    const diffSign = fuelDiff > 0 ? '+' : fuelDiff < 0 ? '-' : '';
    const diffLabel = `${diffSign}${formatNumber(Math.abs(fuelDiff))} л`;

    let explanation = 'Расход соответствует норме.';
    if (fuelDiff < 0) {
      explanation = `Перерасход топлива на ${formatNumber(Math.abs(fuelDiff))} л.`;
    } else if (fuelDiff > 0) {
      explanation = `Остаток топлива по норме ${formatNumber(Math.abs(fuelDiff))} л.`;
    }

    return {
      monthly,
      totals: {
        totalMileage,
        totalLiters,
        fuelNorm,
        totalFuelCost,
        totalCompensation,
        fuelDiff,
        diffLabel
      },
      explanation,
      hasData: monthly.length > 0
    };
  }, [fuelRecords, gasApiIsConfigured]);

  const cardClass =
    'rounded-3xl border border-white/40 bg-white/85 p-6 shadow-card backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]';
  const noticeClass =
    'rounded-2xl border border-slate-200/70 bg-slate-100/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300';
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
            Топливо
          </h2>
        </header>

        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pb-24">
          {gasApiIsConfigured && fuelActionNotice && (
            <div className="rounded-2xl border border-emerald-300/70 bg-emerald-100/80 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-100">
              {fuelActionNotice}
            </div>
          )}

          <FuelSection
            className={cardClass}
            noticeClass={noticeClass}
            fuelSummary={fuelSummary}
            gasApiIsConfigured={gasApiIsConfigured}
            fuelLoading={fuelLoading}
            fuelError={fuelError}
            formatNumber={formatNumber}
          />

          {gasApiIsConfigured && (
            <section className={cardClass}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Записи заправок
              </h3>

              {orderedFuelRecords.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-100/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
                  Пока нет записей.
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {orderedFuelRecords.map((record, index) => (
                    <li
                      key={
                        record.id ??
                        `${record.date}-${record.mileage ?? 'x'}-${record.liters ?? 'x'}-${record.fuelCost ?? 'x'}-${index}`
                      }
                      className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatDisplayDate(record.date)}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditFuelDialog(record)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300/80 bg-white/80 text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-white/15 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
                            aria-label="Редактировать запись топлива"
                          >
                            <i className="pi pi-pencil text-sm" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFuelDelete(record)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/80 bg-rose-50/80 text-rose-700 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                            aria-label="Удалить запись топлива"
                          >
                            <i className="pi pi-trash text-sm" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <dt>Пробег</dt>
                          <dd className="font-semibold text-slate-900 dark:text-slate-100">
                            {record.mileage !== null && record.mileage !== undefined
                              ? `${formatNumber(record.mileage, 0)} км`
                              : '—'}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt>Литры</dt>
                          <dd className="font-semibold text-slate-900 dark:text-slate-100">
                            {record.liters !== null && record.liters !== undefined
                              ? `${formatNumber(record.liters, 2)} л`
                              : '—'}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt>Сумма</dt>
                          <dd className="font-semibold text-slate-900 dark:text-slate-100">
                            {record.fuelCost !== null && record.fuelCost !== undefined
                              ? `${formatNumber(record.fuelCost, 2)} ₽`
                              : '—'}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] z-30 mx-auto w-full max-w-xl px-4 sm:px-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreateFuelDialog}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-[0_12px_30px_rgba(37,99,235,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(37,99,235,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Добавить запись топлива"
          >
            <i className="pi pi-plus text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Dialog
        header={editingFuelRecord ? 'Редактировать запись топлива' : 'Добавить запись топлива'}
        visible={fuelDialogOpen}
        position="bottom"
        modal
        onHide={() => {
          setFuelDialogOpen(false);
          setEditingFuelRecord(null);
          setFuelFormError(null);
        }}
        style={dialogStyle}
        className="p-0"
        headerClassName="bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-slate-100"
        contentClassName="bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-slate-100"
      >
        <form className="mb-4 flex flex-col gap-4" onSubmit={handleFuelSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Дата
            <input
              type="date"
              name="date"
              value={fuelForm.date}
              onChange={handleFuelFormChange}
              onClick={openFuelDatePicker}
              required
              disabled={fuelSubmitting || !gasApiIsConfigured}
              className={fieldClasses}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Пробег (км)
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="mileage"
              value={fuelForm.mileage}
              onChange={handleFuelFormChange}
              disabled={fuelSubmitting || !gasApiIsConfigured}
              className={fieldClasses}
              placeholder="0"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Литры
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="liters"
              value={fuelForm.liters}
              onChange={handleFuelFormChange}
              disabled={fuelSubmitting || !gasApiIsConfigured}
              className={fieldClasses}
              placeholder="0.00"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Сумма заправки (₽)
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="fuelCost"
              value={fuelForm.fuelCost}
              onChange={handleFuelFormChange}
              disabled={fuelSubmitting || !gasApiIsConfigured}
              className={fieldClasses}
              placeholder="0.00"
            />
          </label>

          <button
            className={primaryButtonClass}
            type="submit"
            disabled={fuelSubmitting || !gasApiIsConfigured}
          >
            {fuelSubmitting ? 'Сохраняем…' : editingFuelRecord ? 'Сохранить изменения' : 'Добавить запись'}
          </button>
        </form>

        {fuelFormError && (
          <div className="mt-4 rounded-2xl border border-red-400/45 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200">
            {fuelFormError}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default FuelPage;
