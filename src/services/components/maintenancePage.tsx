import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { createRecord, fetchRecords } from '../maintenanceApi';
import { MaintenanceRecord } from '../../types';
import MaintenanceForm, { MaintenanceFormValues } from './maintenanceForm';
import MaintenanceSection from './maintenanceSection';

type MaintenancePageProps = {
  onClose: () => void;
};

const initialFormState: MaintenanceFormValues = {
  date: '',
  procedure: '',
  mileage: ''
};

function sortRecords(records: MaintenanceRecord[]) {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ onClose }) => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);

  const apiIsConfigured = Boolean(process.env.REACT_APP_API_URL);

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
            СТО
          </h2>
        </header>

        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pb-24">
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
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] z-30 mx-auto w-full max-w-xl px-4 sm:px-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMaintenanceDialogOpen(true)}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-[0_12px_30px_rgba(37,99,235,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(37,99,235,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Добавить запись обслуживания"
          >
            <i className="pi pi-plus text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>

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
          sectionClassName="mb-4"
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

export default MaintenancePage;
