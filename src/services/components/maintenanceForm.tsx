import React, { FormEvent } from 'react';

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
}) => (
  <section className={sectionClassName}>
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-900">
        Дата обслуживания
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={onChange}
          required
          disabled={submitting || !apiIsConfigured}
          className={fieldClassName}
        />
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

export default MaintenanceForm;
