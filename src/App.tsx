import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import MaintenanceForm, { MaintenanceFormValues } from './services/components/maintenanceForm';
import ProfilePage from './services/components/profilePage';
import SalaryPage from './services/components/salaryPage';
import TitleCard from './services/components/titleCard';
import VehicleInfoCard from './services/components/vehicleInfoCard';
import MaintenanceSection from './services/components/maintenanceSection';
import FuelSection from './services/components/fuelSection';
import BottomNav from './services/components/bottomNav';
import { createRecord, fetchRecords } from './services/maintenanceApi';
import { fetchFuelRecords } from './services/fuelApi';
import { FuelRecord, MaintenanceRecord } from './types';
import VTB from './assets/VTB_Logo.png';

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

function sortRecords(records: MaintenanceRecord[]) {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}

function normalizeDate(value?: string): string {
  return value ? value.trim().slice(0, 10) : '';
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

const App: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [salaryPageOpen, setSalaryPageOpen] = useState(false);
  const [profilePageOpen, setProfilePageOpen] = useState(false);

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
    'rounded-3xl border border-white/40 bg-white/85 p-6 shadow-card backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]';
  const fieldClasses =
    'w-full rounded-2xl border border-slate-900/10 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-1 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-400/60 dark:focus:ring-offset-slate-900';
  const primaryButtonClass =
    'inline-flex items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-button transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none active:translate-y-0 active:shadow-buttonActive dark:from-blue-500 dark:to-blue-400';
  const refreshButtonClass =
    'inline-flex items-center justify-center rounded-2xl bg-slate-900/85 px-4 py-2 text-sm font-semibold text-white shadow-buttonMuted transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none active:translate-y-0 dark:bg-slate-700/80 dark:text-slate-100 dark:focus-visible:outline-slate-200';
  const noticeClass =
    'rounded-2xl border border-slate-200/70 bg-slate-100/80 px-4 py-3 text-center text-sm font-medium text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300';

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

  const dialogStyle = { width: '100%', maxWidth: '480px', margin: '0 auto' };

  return (
    <div className="relative min-h-screen pb-28 text-slate-900 dark:text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 pb-20 pt-[calc(env(safe-area-inset-top,0)+2.5rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top,0)+2rem)]">
        <TitleCard
          logoSrc={VTB}
          className={cardClass}
          title="Тигран"
          onTitleClick={() => setProfilePageOpen(true)}
        />

        <FuelSection
          className={cardClass}
          noticeClass={noticeClass}
          fuelSummary={fuelSummary}
          gasApiIsConfigured={gasApiIsConfigured}
          fuelLoading={fuelLoading}
          fuelError={fuelError}
          formatNumber={formatNumber}
        />

        <VehicleInfoCard className={cardClass} />

        <MaintenanceSection
          className={cardClass}
          noticeClass={noticeClass}
          refreshButtonClass={refreshButtonClass}
          lastRecords={lastRecords}
          recordsCount={records.length}
          loading={loading}
          submitting={submitting}
          apiIsConfigured={apiIsConfigured}
          onRefresh={loadMaintenanceRecords}
        />
      </main>

      {profilePageOpen && <ProfilePage onClose={() => setProfilePageOpen(false)} />}

      {salaryPageOpen && <SalaryPage onClose={() => setSalaryPageOpen(false)} />}

      <BottomNav
        onOpenMaintenance={() => setMaintenanceDialogOpen(true)}
        onOpenSalary={() => setSalaryPageOpen(true)}
      />

      <Dialog
        header="Авто обслуживание"
        visible={maintenanceDialogOpen}
        position="bottom"
        modal
        onHide={() => setMaintenanceDialogOpen(false)}
        style={dialogStyle}
        className="p-0"
        headerClassName="bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-slate-100"
        contentClassName="bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-slate-100"
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

    </div>
  );
};

export default App;
