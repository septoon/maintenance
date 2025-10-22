import React, { FormEvent, useRef } from 'react';

export interface MaintenanceFormValues {
  date: string;
  procedure: string;
  mileage: string;
}

interface MaintenanceFormProps {
  sectionClassName: string;
  fieldClassName: string;
  buttonClassName: string;
  form: MaintenanceFormValues;
  submitting: boolean;
  apiIsConfigured: boolean;
  error: string | null;
  success: string | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
  sectionClassName,
  fieldClassName,
  buttonClassName,
  form,
  submitting,
  apiIsConfigured,
  error,
  success,
  onChange,
  onSubmit,
}) => {
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const openDatePicker = () => {
    const node = dateInputRef.current;
    if (!node || node.disabled) return;

    if (typeof node.showPicker === 'function') {
      node.showPicker();
    } else {
      node.focus();
    }
  };

  return (
    <section className={sectionClassName}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900">
          Дата обслуживания
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              required
              disabled={submitting || !apiIsConfigured}
              className={`${fieldClassName} pr-14`}
            />
            <button
              type="button"
              aria-label="Выбрать дату обслуживания"
              onClick={openDatePicker}
              disabled={submitting || !apiIsConfigured}
              className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-slate-400 transition hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <i className="pi pi-calendar text-lg" aria-hidden="true" />
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900">
          Процедура
          <textarea
            name="procedure"
            value={form.procedure}
            onChange={onChange}
            rows={3}
            placeholder="Например, Замена масла"
            required
            disabled={submitting || !apiIsConfigured}
            className={fieldClassName}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900">
          Пробег (км)
          <input
            type="number"
            inputMode="numeric"
            name="mileage"
            value={form.mileage}
            onChange={onChange}
            required
            min="0"
            disabled={submitting || !apiIsConfigured}
            className={fieldClassName}
          />
        </label>

        <button
          className={buttonClassName}
          type="submit"
          disabled={submitting || !apiIsConfigured}
        >
          {submitting ? 'Сохраняем…' : 'Добавить запись'}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/45 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-2xl border border-green-400/45 bg-green-100/70 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      )}
    </section>
  );
};

export default MaintenanceForm;
