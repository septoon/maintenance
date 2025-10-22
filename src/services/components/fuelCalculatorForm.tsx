import React, { FormEvent, useEffect, useState } from 'react';
import { createFuelRecord } from '../fuelApi';

type FuelFormState = {
  mileage: string;
  liters: string;
};

interface FuelCalculatorFormProps {
  sectionClassName: string;
  fieldClassName: string;
  buttonClassName: string;
  apiIsConfigured: boolean;
  onSubmitted?: () => Promise<void> | void;
}

const initialState: FuelFormState = {
  mileage: '',
  liters: ''
};

const FuelCalculatorForm: React.FC<FuelCalculatorFormProps> = ({
  sectionClassName,
  fieldClassName,
  buttonClassName,
  apiIsConfigured,
  onSubmitted
}) => {
  const [form, setForm] = useState<FuelFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => setSuccess(null), 2500);
    return () => clearTimeout(timeout);
  }, [success]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiIsConfigured) {
      setError('Добавьте REACT_APP_API_GAS в .env перед использованием формы.');
      return;
    }

    const mileageTrimmed = form.mileage.trim();
    const litersTrimmed = form.liters.trim();

    if (!mileageTrimmed && !litersTrimmed) {
      setError('Укажите пробег или бензин.');
      return;
    }

    let mileageValue: number | undefined;
    let litersValue: number | undefined;

    if (mileageTrimmed) {
      mileageValue = Number(mileageTrimmed.replace(',', '.'));
      if (Number.isNaN(mileageValue) || mileageValue < 0) {
        setError('Пробег должен быть неотрицательным числом.');
        return;
      }
    }

    if (litersTrimmed) {
      litersValue = Number(litersTrimmed.replace(',', '.'));
      if (Number.isNaN(litersValue) || litersValue < 0) {
        setError('Количество бензина должно быть неотрицательным числом.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      await createFuelRecord({
        date: new Date().toISOString().split('T')[0],
        mileage: mileageValue ?? null,
        liters: litersValue ?? null
      });

      setForm(initialState);
      setSuccess('Запись по расходу топлива сохранена.');
      await onSubmitted?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить данные топлива.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={sectionClassName}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900">
          Пробег (км)
          <input
            type="number"
            name="mileage"
            inputMode="decimal"
            value={form.mileage}
            onChange={handleChange}
            placeholder="Сколько километров проехали"
            disabled={submitting || !apiIsConfigured}
            className={fieldClassName}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900">
          Бензин (л)
          <input
            type="number"
            name="liters"
            inputMode="decimal"
            value={form.liters}
            onChange={handleChange}
            placeholder="Сколько литров заправили"
            disabled={submitting || !apiIsConfigured}
            className={fieldClassName}
          />
        </label>

        <button
          className={buttonClassName}
          type="submit"
          disabled={submitting || !apiIsConfigured}
        >
          {submitting ? 'Сохраняем…' : 'Добавить данные'}
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

export default FuelCalculatorForm;
