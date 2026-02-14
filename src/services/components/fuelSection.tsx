import React, { useEffect, useMemo, useState } from 'react';
import { FuelRecord } from '../../types';

type FuelSummaryMonth = {
  key: string;
  label: string;
  totalMileage: number;
  totalLiters: number;
  fuelNorm: number;
  fuelCost: number;
  fuelDiff: number;
  diffLabel: string;
  approvedRate: number;
  compensation: number;
  paidCompensation: number;
  debtDeductionAmount: number;
  debtDeductionLiters: number;
  effectiveDebtDeductionLiters: number;
  effectiveAppliedCompensation: number;
  remainingCompensation: number;
  incomingCarryoverDebtRub: number;
  incomingCarryoverDebtLiters: number;
  monthCarryoverDebtRub: number;
  monthCarryoverDebtLiters: number;
  projectedDebtDeductionFromCarryover: number;
  projectedPayout: number;
  isCompensationClosed: boolean;
  compensationStatusLabel: string;
  adjustments: FuelRecord[];
};

type FuelSummaryTotals = {
  totalMileage: number;
  totalLiters: number;
  fuelNorm: number;
  totalFuelCost: number;
  totalCompensation: number;
  totalPaidCompensation: number;
  totalDebtDeductionAmount: number;
  totalDebtDeductionLiters: number;
  effectiveDebtDeductionAmount: number;
  effectiveDebtDeductionLiters: number;
  hasEstimatedDebtDeductionAmount: boolean;
  hasEstimatedDebtDeductionLiters: boolean;
  carryoverDebtRub: number;
  carryoverDebtLiters: number;
  netCompensation: number;
  fuelDiff: number;
  diffLabel: string;
  adjustedFuelDiff: number;
  adjustedDiffLabel: string;
};

type FuelSummary = {
  monthly: FuelSummaryMonth[];
  totals: FuelSummaryTotals;
  explanation: string;
  hasData: boolean;
};

type FuelSectionProps = {
  className: string;
  noticeClass: string;
  fuelSummary: FuelSummary;
  gasApiIsConfigured: boolean;
  fuelLoading: boolean;
  fuelError: string | null;
  formatNumber: (value: number, maximumFractionDigits?: number) => string;
  onEditAdjustment: (record: FuelRecord) => void;
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

function formatMonthOnly(value: FuelSummaryMonth): string {
  const [year, month] = value.key.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value.label;
  }
  return MONTH_LABELS[monthIndex];
}

const FuelSection: React.FC<FuelSectionProps> = ({
  className,
  noticeClass,
  fuelSummary,
  gasApiIsConfigured,
  fuelLoading,
  fuelError,
  formatNumber,
  onEditAdjustment
}) => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const years = useMemo(() => {
    const unique: Record<string, true> = {};
    fuelSummary.monthly.forEach(month => {
      const year = month.key.split('-')[0];
      if (year && /^\d{4}$/.test(year)) {
        unique[year] = true;
      }
    });
    return Object.keys(unique).sort((a, b) => Number(b) - Number(a));
  }, [fuelSummary.monthly]);

  useEffect(() => {
    if (years.length === 0) {
      setSelectedYear(null);
      return;
    }
    setSelectedYear(prev => (prev && years.includes(prev) ? prev : years[0]));
  }, [years]);

  const yearMonths = useMemo(() => {
    if (!selectedYear) return fuelSummary.monthly;
    return fuelSummary.monthly.filter(month => month.key.startsWith(`${selectedYear}-`));
  }, [fuelSummary.monthly, selectedYear]);

  return (
    <section className={className}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Расчёт топлива
        </h2>

        <span
              className={`text-base font-semibold ${fuelSummary.totals.adjustedFuelDiff < 0 ? 'text-red-600 dark:text-red-400' : fuelSummary.totals.adjustedFuelDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}
            >
              {fuelSummary.totals.adjustedFuelDiff < 0 ? 'долг' : 'в плюсе'} {fuelSummary.totals.adjustedDiffLabel}
            </span>
      </header>

    {!gasApiIsConfigured && (
      <div className={noticeClass}>
        Укажите адрес сервера в файле .env (переменная REACT_APP_API_GAS).
      </div>
    )}

    {gasApiIsConfigured && fuelError && (
      <div className="rounded-2xl border border-red-400/45 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200">
        {fuelError}
      </div>
    )}

    {gasApiIsConfigured && fuelLoading && fuelSummary.monthly.length === 0 && !fuelError && (
      <div className={noticeClass}>Загружаем данные по топливу…</div>
    )}

    {gasApiIsConfigured && !fuelLoading && !fuelError && !fuelSummary.hasData && (
      <div className={noticeClass}>Пока нет данных по заправкам и корректировкам.</div>
    )}

    {gasApiIsConfigured && fuelSummary.hasData && (
      <div className="space-y-4">
        {years.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
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
        )}

        <div className="space-y-3">
          {yearMonths.length === 0 && selectedYear && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Нет данных за {selectedYear}.
            </div>
          )}
          {yearMonths.map(month => {
            const isExpanded = expandedMonth === month.key;
            return (
              <div
                key={month.key}
                className="rounded-2xl border border-slate-900/10 bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80"
              >
                <button
                  type="button"
                  onClick={() => setExpandedMonth(isExpanded ? null : month.key)}
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {formatMonthOnly(month)}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        month.isCompensationClosed
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : month.effectiveAppliedCompensation > 0 || month.incomingCarryoverDebtRub > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {month.compensationStatusLabel}
                    </span>
                  </div>
                  <span className="flex items-center gap-3">
                    <span
                      className={`text-sm font-light ${month.fuelDiff < 0 ? 'text-red-600 dark:text-red-400' : month.fuelDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}
                    >
                      {formatNumber(month.approvedRate, 1)} л.
                    </span>
                    <i
                      className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-slate-600 dark:text-slate-300`}
                    />
                  </span>
                </button>
                {isExpanded && (
                  <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        Пройдено км:
                      </dt>
                      <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {formatNumber(month.totalMileage, 0)} км
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        Норма топлива:
                      </dt>
                      <dd className="text-base font-light text-slate-900 dark:text-slate-100">
                        {formatNumber(month.fuelNorm)} л
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        Заправлено:
                      </dt>
                      <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {formatNumber(month.totalLiters)} л
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        Сумма заправки:
                      </dt>
                      <dd className="text-base font-light text-slate-900 dark:text-slate-100">
                        {formatNumber(month.fuelCost, 2)} ₽
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        Разница:
                      </dt>
                      <dd
                        className={`text-base font-semibold ${month.fuelDiff < 0 ? 'text-red-600 dark:text-red-400' : month.fuelDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}
                      >
                        {month.diffLabel}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        Компенсация ГСМ:
                      </dt>
                      <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {formatNumber(month.compensation, 0)} ₽
                      </dd>
                    </div>
                    {month.effectiveAppliedCompensation > 0 && (
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-slate-900 dark:text-slate-100">
                          Учтено по месяцу:
                        </dt>
                        <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {formatNumber(month.effectiveAppliedCompensation, 2)} ₽
                        </dd>
                      </div>
                    )}
                    {month.incomingCarryoverDebtRub > 0 && (
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-slate-900 dark:text-slate-100">
                          Долг из прошлого месяца:
                        </dt>
                        <dd className="text-base font-semibold text-amber-700 dark:text-amber-300">
                          {formatNumber(month.incomingCarryoverDebtRub, 2)} ₽
                        </dd>
                      </div>
                    )}
                    {month.projectedDebtDeductionFromCarryover > 0 && month.debtDeductionAmount === 0 && (
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-slate-900 dark:text-slate-100">
                          План удержания в месяце:
                        </dt>
                        <dd className="text-base font-semibold text-amber-700 dark:text-amber-300">
                          ≈ {formatNumber(month.projectedDebtDeductionFromCarryover, 2)} ₽
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-slate-900 dark:text-slate-100">
                        К выплате за месяц:
                      </dt>
                      <dd
                        className={`text-base font-semibold ${month.remainingCompensation <= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}
                      >
                        {month.remainingCompensation <= 0
                          ? '0 ₽ (закрыто)'
                          : `${formatNumber(month.remainingCompensation, 2)} ₽`}
                      </dd>
                    </div>
                    {month.monthCarryoverDebtRub > 0 && (
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-slate-900 dark:text-slate-100">
                          Перенос долга на след. месяц:
                        </dt>
                        <dd className="text-base font-semibold text-red-600 dark:text-red-300">
                          {formatNumber(month.monthCarryoverDebtRub, 2)} ₽
                        </dd>
                      </div>
                    )}
                    {month.adjustments.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/70 dark:bg-slate-900/60">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Корректировки месяца
                        </div>
                        {month.adjustments.map((record, index) => (
                          <div
                            key={
                              record.id ??
                              `${month.key}-${record.adjustmentKind ?? 'x'}-${record.amount ?? 'x'}-${record.liters ?? 'x'}-${index}`
                            }
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {record.adjustmentKind === 'debt_deduction'
                                  ? 'Вычет долга'
                                  : 'Выплата компенсации'}
                              </div>
                              <div className="truncate text-xs text-slate-600 dark:text-slate-400">
                                {record.amount !== null && record.amount !== undefined
                                  ? `${formatNumber(record.amount, 2)} ₽`
                                  : '—'}
                                {' · '}
                                {record.liters !== null && record.liters !== undefined
                                  ? `${formatNumber(record.liters, 2)} л`
                                  : '—'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onEditAdjustment(record)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-300/80 bg-white/80 text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-white/15 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
                              aria-label="Редактировать корректировку месяца"
                            >
                              <i className="pi pi-pencil text-sm" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
        <div className="rounded-2xl border border-slate-900/10 bg-slate-50/70 px-4 py-3 dark:border-slate-800/70 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-green-900 dark:text-emerald-300">
              Итог за период
            </span>
          </div>
          <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Пройдено км:
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(fuelSummary.totals.totalMileage, 0)} км
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">Заправлено:</dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(fuelSummary.totals.totalLiters)} л
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Сумма заправки:
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(fuelSummary.totals.totalFuelCost, 2)} ₽
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Начислено ГСМ:
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(fuelSummary.totals.totalCompensation, 0)} ₽
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Выплачено:
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(fuelSummary.totals.totalPaidCompensation, 2)} ₽
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Вычтено долга (₽):
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {fuelSummary.totals.hasEstimatedDebtDeductionAmount ? '≈ ' : ''}
                {formatNumber(fuelSummary.totals.effectiveDebtDeductionAmount, 2)} ₽
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Вычтено долга (л):
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {fuelSummary.totals.hasEstimatedDebtDeductionLiters ? '≈ ' : ''}
                {formatNumber(fuelSummary.totals.effectiveDebtDeductionLiters, 2)} л
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Перенос долга на след. месяц (₽):
              </dt>
              <dd className="text-base font-semibold text-red-600 dark:text-red-300">
                {fuelSummary.totals.carryoverDebtRub > 0
                  ? `${formatNumber(fuelSummary.totals.carryoverDebtRub, 2)} ₽`
                  : '0 ₽'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Перенос долга на след. месяц (л):
              </dt>
              <dd className="text-base font-semibold text-red-600 dark:text-red-300">
                {fuelSummary.totals.carryoverDebtRub > 0
                  ? `≈ ${formatNumber(fuelSummary.totals.carryoverDebtLiters, 2)} л`
                  : '0 ₽'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Остаток к выплате:
              </dt>
              <dd
                className={`text-base font-semibold ${fuelSummary.totals.netCompensation < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}
              >
                {formatNumber(fuelSummary.totals.netCompensation, 2)} ₽
              </dd>
            </div>
            <div className="flex items-center justify-between border-t dark:border-slate-800/80 pt-2">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                Остаток долга по топливу:
              </dt>
              <dd
                className={`text-base font-semibold ${fuelSummary.totals.adjustedFuelDiff < 0 ? 'text-red-600 dark:text-red-400' : fuelSummary.totals.adjustedFuelDiff > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}
              >
                {fuelSummary.totals.adjustedDiffLabel}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    )}
    </section>
  );
};

export default FuelSection;
