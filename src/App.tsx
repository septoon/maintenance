import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import MaintenanceForm, { MaintenanceFormValues } from './services/components/maintenanceForm';
import FuelCalculatorForm from './services/components/fuelCalculatorForm';
import { createRecord, fetchRecords } from './services/maintenanceApi';
import { fetchFuelRecords } from './services/fuelApi';
import { FuelRecord, MaintenanceRecord } from './types';

const initialFormState: MaintenanceFormValues = {
  date: '',
  procedure: '',
  mileage: ''
};

const FUEL_CONSUMPTION_RATE = 9.4;
const FUEL_CONSUMPTION_RATE_INCREASE = 0.07;
const FUEL_CONSUMPTION_RATE_DATES = new Set([
  '2025-12-31',
  '2026-01-31',
  '2026-02-28',
  '2026-03-31'
]);

function formatDisplayDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function sortRecords(records: MaintenanceRecord[]) {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}

function getFuelConsumptionRate(date?: string): number {
  if (date && FUEL_CONSUMPTION_RATE_DATES.has(date)) {
    return FUEL_CONSUMPTION_RATE * (1 + FUEL_CONSUMPTION_RATE_INCREASE);
  }

  return FUEL_CONSUMPTION_RATE;
}

const App: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);

  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelError, setFuelError] = useState<string | null>(null);

  const apiIsConfigured = Boolean(process.env.REACT_APP_API_URL);
  const gasApiIsConfigured = Boolean(process.env.REACT_APP_API_GAS);

  const loadMaintenanceRecords = useCallback(async () => {
    if (!apiIsConfigured) {
      setLoading(false);
      setError('Добавьте REACT_APP_API_URL в .env перед использованием приложения.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecords();
      setRecords(sortRecords(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить записи.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiIsConfigured]);

  useEffect(() => {
    loadMaintenanceRecords();
  }, [loadMaintenanceRecords]);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiIsConfigured) {
      setError('Добавьте REACT_APP_API_URL в .env перед использованием приложения.');
      return;
    }

    const trimmedProcedure = form.procedure.trim();
    const trimmedDate = form.date.trim();
    const mileageNumber = Number(form.mileage);

    if (!trimmedDate || !trimmedProcedure || !form.mileage) {
      setError('Заполните дату, процедуру и пробег.');
      return;
    }

    if (Number.isNaN(mileageNumber) || mileageNumber < 0) {
      setError('Пробег должен быть неотрицательным числом.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const record = await createRecord({
        date: trimmedDate,
        procedure: trimmedProcedure,
        mileage: mileageNumber
      });
      setRecords(prev => sortRecords([...prev, record]));
      setForm(initialFormState);
      setSuccess('Запись успешно сохранена.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить запись.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const lastRecords = useMemo(() => sortRecords(records).slice(0, 10), [records]);
  const cardClass =
    'rounded-3xl border border-white/40 bg-white/85 p-6 shadow-card backdrop-blur-lg';
  const fieldClasses =
    'w-full rounded-2xl border border-slate-900/10 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70';
  const primaryButtonClass =
    'inline-flex items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-button transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none active:translate-y-0 active:shadow-buttonActive';
  const refreshButtonClass =
    'inline-flex items-center justify-center rounded-2xl bg-slate-900/85 px-4 py-2 text-sm font-semibold text-white shadow-buttonMuted transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none active:translate-y-0';
  const noticeClass =
    'rounded-2xl border border-slate-200/70 bg-slate-100/80 px-4 py-3 text-center text-sm font-medium text-slate-600';

  const fuelSummary = useMemo(() => {
    if (!gasApiIsConfigured || fuelRecords.length === 0) {
      return {
        totalMileage: 0,
        totalLiters: 0,
        fuelNorm: 0,
        fuelDiff: 0,
        diffLabel: '',
        explanation: '',
        lastMileage: null,
        hasData: false
      };
    }

    const orderedFuelRecords = [...fuelRecords].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date < b.date ? -1 : 1;
    });

    const totalMileage = orderedFuelRecords.reduce((acc, item) => acc + (item.mileage ?? 0), 0);
    const lastMileageEntry = orderedFuelRecords[orderedFuelRecords.length - 1];
    const lastMileage = lastMileageEntry?.mileage ?? null;
    const totalLiters = orderedFuelRecords.reduce((acc, item) => acc + (item.liters ?? 0), 0);
    const fuelNorm = orderedFuelRecords.reduce((acc, item) => {
      const mileage = item.mileage ?? 0;
      if (mileage <= 0) return acc;
      const rate = getFuelConsumptionRate(item.date);
      return acc + (mileage * rate) / 100;
    }, 0);
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
      totalMileage,
      totalLiters,
      fuelNorm,
      fuelDiff,
      diffLabel,
      explanation,
      lastMileage,
      hasData: totalMileage > 0 || totalLiters > 0 || lastMileage !== null
    };
  }, [fuelRecords, gasApiIsConfigured]);

  const dialogStyle = { width: '100%', maxWidth: '480px', margin: '0 auto' };

  return (
    <div className="relative min-h-screen pb-28">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 pb-20 pt-[calc(env(safe-area-inset-top,0)+2.5rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top,0)+2rem)]">
        <section className={cardClass}>
          <h1 className="text-3xl font-bold text-slate-900">Авто обслуживание</h1>
        </section>

        <section className={cardClass}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Kia Rio IV</h2>
          </div>
          <dl className="space-y-5">
            <div className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900">Госномер:</dt>
              <dd className="text-base text-slate-900">М542ТМ 82</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900">VIN:</dt>
              <dd className="text-base text-slate-900">Z94C241BBJR037440</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900">СТС:</dt>
              <dd className="text-base text-slate-900">99 84 824631</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900">ПТС:</dt>
              <dd className="text-base text-slate-900">82 РУ 074120</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900">Цвет кузова (кабины):</dt>
              <dd className="text-base text-slate-900">Белый</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900">Объем двигателя (см³):</dt>
              <dd className="text-base text-slate-900">1591</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900">Мощность (л.с.):</dt>
              <dd className="text-base text-slate-900">123</dd>
            </div>
          </dl>
        </section>

        <section className={cardClass}>
          <header className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="flex-1 text-xl font-semibold text-slate-900">Последние записи</h2>
            <button
              type="button"
              onClick={loadMaintenanceRecords}
              disabled={loading || submitting || !apiIsConfigured}
              className={refreshButtonClass}
            >
              {loading ? 'Обновляем…' : 'Обновить'}
            </button>
          </header>

          {!apiIsConfigured && (
            <div className={noticeClass}>
              Укажите адрес сервера в файле .env (переменная REACT_APP_API_URL).
            </div>
          )}

          {apiIsConfigured && loading && records.length === 0 && (
            <div className={noticeClass}>Загружаем записи…</div>
          )}

          {apiIsConfigured && !loading && records.length === 0 && !error && (
            <div className={noticeClass}>Пока нет данных об обслуживании.</div>
          )}

          {lastRecords.length > 0 && (
            <ul className="mt-4 space-y-3">
              {lastRecords.map(record => {
                const intervalByProcedure: Record<string, number> = {
                  'Замена масла': 6000,
                  'Замена свечей': 20000,
                  'Замена колодок': 40000
                };

                const interval = intervalByProcedure[record.procedure];
                const nextMileage = typeof interval === 'number' ? record.mileage + interval : null;

                return (
                  <li
                    key={record.id ?? `${record.date}-${record.procedure}-${record.mileage}`}
                    className="grid gap-1 rounded-2xl border border-slate-900/10 bg-slate-50/90 p-4 shadow-sm"
                  >
                    <strong className="text-base font-semibold text-slate-900">
                      {formatDisplayDate(record.date)}
                    </strong>
                    <div className="text-sm text-slate-700">
                      <span>{record.procedure} - </span>
                      <span className="font-semibold text-blue-900">
                        {record.mileage.toLocaleString('ru-RU')} км
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span>След. замена ~ </span>
                      {nextMileage !== null ? (
                        <span className="font-semibold text-blue-900">
                          {nextMileage.toLocaleString('ru-RU')} км
                        </span>
                      ) : (
                        <span>не задано</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <header className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="flex-1 text-xl font-semibold text-slate-900">Расчёт топлива</h2>
            <button
              type="button"
              onClick={loadFuelRecords}
              disabled={fuelLoading || !gasApiIsConfigured}
              className={refreshButtonClass}
            >
              {fuelLoading ? 'Обновляем…' : 'Обновить'}
            </button>
          </header>

          {!gasApiIsConfigured && (
            <div className={noticeClass}>
              Укажите адрес сервера в файле .env (переменная REACT_APP_API_GAS).
            </div>
          )}

          {gasApiIsConfigured && fuelError && (
            <div className="rounded-2xl border border-red-400/45 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700">
              {fuelError}
            </div>
          )}

          {gasApiIsConfigured && fuelLoading && fuelRecords.length === 0 && !fuelError && (
            <div className={noticeClass}>Загружаем данные по топливу…</div>
          )}

          {gasApiIsConfigured && !fuelLoading && !fuelError && !fuelSummary.hasData && (
            <div className={noticeClass}>Пока нет данных о заправках.</div>
          )}

          {gasApiIsConfigured && fuelSummary.hasData && (
            <div className="space-y-4">
              <dl className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-slate-900">Пройдено км:</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {formatNumber(fuelSummary.totalMileage, 0)} км
                  </dd>
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <dt className="font-light text-slate-900">Последний пробег:</dt>
                  <dd className="text-sm font-light text-slate-900">
                    {fuelSummary.lastMileage !== null ? `+${formatNumber(fuelSummary.lastMileage, 0)} км` : 'нет данных'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-slate-900">Норма топлива:</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {formatNumber(fuelSummary.fuelNorm)} л
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-slate-900">Заправлено:</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {formatNumber(fuelSummary.totalLiters)} л
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-slate-900">Разница:</dt>
                  <dd className={`text-base font-semibold ${fuelSummary.fuelDiff < 0 ? 'text-red-600' : fuelSummary.fuelDiff > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {fuelSummary.diffLabel}
                  </dd>
                </div>
              </dl>
              <p className="text-sm font-medium text-slate-700">{fuelSummary.explanation}</p>
            </div>
          )}
        </section>
      </main>

      <nav
  className="fixed bottom-4 left-1/2 flex w-3/4 -translate-x-1/2 items-center justify-between rounded-full border border-white/60 bg-white/10 px-6 py-3 shadow-card backdrop-blur-lg">
        <button
          type="button"
          onClick={() => setMaintenanceDialogOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-button transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-label="Открыть форму автообслуживания"
        >
          <i className="pi pi-car text-xl" />
        </button>

        <button
          type="button"
          onClick={() => setFuelDialogOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 text-white shadow-buttonMuted transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          aria-label="Открыть расчёт расхода топлива"
        >
          <i className="pi pi-calculator text-xl" />
        </button>
      </nav>

      <Dialog
        header="Авто обслуживание"
        visible={maintenanceDialogOpen}
        position="bottom"
        modal
        onHide={() => setMaintenanceDialogOpen(false)}
        style={dialogStyle}
        className="p-0"
        contentClassName=""
      >
        <MaintenanceForm
          sectionClassName={`mb-4`}
          fieldClassName={fieldClasses}
          buttonClassName={primaryButtonClass}
          form={form}
          submitting={submitting}
          apiIsConfigured={apiIsConfigured}
          error={error}
          success={success}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </Dialog>

      <Dialog
        header="Расчёт топлива"
        visible={fuelDialogOpen}
        position="bottom"
        modal
        onHide={() => setFuelDialogOpen(false)}
        style={dialogStyle}
        className="p-0"
        contentClassName=""
      >
        <FuelCalculatorForm
          sectionClassName={`mb-4`}
          fieldClassName={fieldClasses}
          buttonClassName={primaryButtonClass}
          apiIsConfigured={gasApiIsConfigured}
          onSubmitted={loadFuelRecords}
        />
      </Dialog>
    </div>
  );
};

export default App;
