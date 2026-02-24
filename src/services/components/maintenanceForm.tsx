import React, { FormEvent, useRef } from 'react';

export interface MaintenanceFormPartValues {
  id: string;
  name: string;
  cost: string;
}

export interface MaintenanceFormValues {
  date: string;
  procedure: string;
  mileage: string;
  parts: MaintenanceFormPartValues[];
  workCost: string;
}

interface MaintenanceFormProps {
  sectionClassName: string;
  fieldClassName: string;
  buttonClassName: string;
  submitLabel: string;
  form: MaintenanceFormValues;
  submitting: boolean;
  apiIsConfigured: boolean;
  error: string | null;
  success: string | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPartChange: (partId: string, field: 'name' | 'cost', value: string) => void;
  onPartAdd: () => void;
  onPartRemove: (partId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
  sectionClassName,
  fieldClassName,
  buttonClassName,
  submitLabel,
  form,
  submitting,
  apiIsConfigured,
  error,
  success,
  onChange,
  onPartChange,
  onPartAdd,
  onPartRemove,
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
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          Дата обслуживания
          <div className="flex items-center gap-3">
            <input
              ref={dateInputRef}
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              required
              disabled={submitting || !apiIsConfigured}
              className={`${fieldClassName} flex-1 min-w-0`}
            />
            <button
              type="button"
              aria-label="Выбрать дату обслуживания"
              onClick={openDatePicker}
              disabled={submitting || !apiIsConfigured}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-900/10 bg-white/90 text-slate-500 shadow-sm transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:outline-blue-300"
            >
              <i className="pi pi-calendar text-lg" aria-hidden="true" />
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
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

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
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

        <div className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between gap-2">
            <span>Запчасти</span>
            <button
              type="button"
              onClick={onPartAdd}
              disabled={submitting || !apiIsConfigured}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
            >
              <i className="pi pi-plus text-xs" />
              Добавить
            </button>
          </div>

          {form.parts.length === 0 && (
            <div className="rounded-xl border border-slate-900/10 bg-slate-50/70 px-3 py-2 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
              Запчасти не добавлены
            </div>
          )}

          {form.parts.map(part => (
            <div
              key={part.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-900/10 bg-slate-50/70 p-2 dark:border-slate-700/60 dark:bg-slate-900/60 sm:grid sm:grid-cols-[1fr_150px_auto] sm:items-center"
            >
              <input
                type="text"
                value={part.name}
                onChange={event => onPartChange(part.id, 'name', event.target.value)}
                placeholder="Название запчасти"
                disabled={submitting || !apiIsConfigured}
                className={fieldClassName}
              />
              <input
                type="number"
                inputMode="decimal"
                value={part.cost}
                onChange={event => onPartChange(part.id, 'cost', event.target.value)}
                min="0"
                step="0.01"
                placeholder="Стоимость"
                disabled={submitting || !apiIsConfigured}
                className={fieldClassName}
              />
              <button
                type="button"
                onClick={() => onPartRemove(part.id)}
                disabled={submitting || !apiIsConfigured}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
              >
                <i className="pi pi-trash" />
              </button>
            </div>
          ))}
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          Стоимость работы (₽)
          <input
            type="number"
            inputMode="decimal"
            name="workCost"
            value={form.workCost}
            onChange={onChange}
            min="0"
            step="0.01"
            placeholder="Опционально"
            disabled={submitting || !apiIsConfigured}
            className={fieldClassName}
          />
        </label>

        <button
          className={buttonClassName}
          type="submit"
          disabled={submitting || !apiIsConfigured}
        >
          {submitting ? 'Сохраняем…' : submitLabel}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/45 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-2xl border border-green-400/45 bg-green-100/70 px-4 py-3 text-sm font-medium text-green-700 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </div>
      )}
    </section>
  );
};

export default MaintenanceForm;
