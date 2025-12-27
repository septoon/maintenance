import React, { useState } from 'react';

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
};

type FuelSummaryTotals = {
  totalMileage: number;
  totalLiters: number;
  fuelNorm: number;
  totalFuelCost: number;
  totalCompensation: number;
  fuelDiff: number;
  diffLabel: string;
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
  logoSrc: string;
  formatNumber: (value: number, maximumFractionDigits?: number) => string;
};

const FuelSection: React.FC<FuelSectionProps> = ({
  className,
  noticeClass,
  fuelSummary,
  gasApiIsConfigured,
  fuelLoading,
  fuelError,
  logoSrc,
  formatNumber
}) => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  return (
    <section className={className}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Расчёт топлива
        </h2>
        <img src={logoSrc} alt="VTB" className="h-8 w-auto sm:h-6 dark:opacity-90" />
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
      <div className={noticeClass}>Пока нет данных о заправках.</div>
    )}

    {gasApiIsConfigured && fuelSummary.hasData && (
      <div className="space-y-4">
        <div className="space-y-3">
          {fuelSummary.monthly.map(month => {
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
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {month.label}
                  </h3>
                  <span className="flex items-center gap-3">
                    <span
                      className={`text-sm font-light ${month.fuelDiff < 0 ? 'text-red-600 dark:text-red-400' : month.fuelDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}
                    >
                      {formatNumber(month.approvedRate, 2)} л / 100 км
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
                Компенсация ГСМ:
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(fuelSummary.totals.totalCompensation, 0)} ₽
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <span
              className={`text-base font-semibold ${fuelSummary.totals.fuelDiff < 0 ? 'text-red-600 dark:text-red-400' : fuelSummary.totals.fuelDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}
            >
              Перерасход топлива на {fuelSummary.totals.diffLabel}
            </span>
          </div>
        </div>
      </div>
    )}
    </section>
  );
};

export default FuelSection;
