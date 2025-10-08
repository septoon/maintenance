import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRecord, fetchRecords } from './services/maintenanceApi';
import { MaintenanceRecord } from './types';

const initialFormState = {
  date: '',
  procedure: '',
  mileage: ''
};

function formatDisplayDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function sortRecords(records: MaintenanceRecord[]) {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
}

const App: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiIsConfigured = Boolean(process.env.REACT_APP_API_URL);

  useEffect(() => {
    if (!apiIsConfigured) {
      setLoading(false);
      setError('Добавьте REACT_APP_API_URL в .env перед использованием приложения.');
      return;
    }

    const load = async () => {
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
    };

    load();
  }, [apiIsConfigured]);

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

  return (
    <main>
      <section>
        <h1>Авто обслуживание</h1>
      </section>

            <section>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Kia Rio IV</h2>
        </header>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Госномер:</h3>
          <span style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>М542ТМ 82</span>
        </header>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>VIN:</h3>
          <span style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Z94C241BBJR037440</span>
        </header>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>СТС:</h3>
          <span style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>99 84 824631</span>
        </header>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>ПТС:</h3>
          <span style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>82 РУ 074120</span>
        </header>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Цвет кузова (кабины):</h3>
          <span style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Белый</span>
        </header>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Объем двигателя (см³):</h3>
          <span style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>1591</span>
        </header>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Мощьность (л.с.):</h3>
          <span style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>123</span>
        </header>

      </section>

      <section>
        <form onSubmit={handleSubmit}>
          <label>
            Дата обслуживания
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              disabled={submitting || !apiIsConfigured}
            />
          </label>

          <label>
            Процедура
            <textarea
              name="procedure"
              value={form.procedure}
              onChange={handleChange}
              rows={3}
              placeholder="Например, Замена масла"
              required
              disabled={submitting || !apiIsConfigured}
            />
          </label>

          <label>
            Пробег (км)
            <input
              type="number"
              inputMode="numeric"
              name="mileage"
              value={form.mileage}
              onChange={handleChange}
              required
              min="0"
              disabled={submitting || !apiIsConfigured}
            />
          </label>

          <button type="submit" disabled={submitting || !apiIsConfigured}>
            {submitting ? 'Сохраняем…' : 'Добавить запись'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </section>

      <section>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Последние записи</h2>
          <button
            type="button"
            onClick={async () => {
              if (!apiIsConfigured) return;
              try {
                setLoading(true);
                setError(null);
                const data = await fetchRecords();
                setRecords(sortRecords(data));
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Не удалось обновить список.';
                setError(message);
              } finally {
                setLoading(false);
              }
            }}
            style={{
              padding: '0.55rem 1rem',
              background: 'rgba(15, 23, 42, 0.85)',
              boxShadow: '0 10px 16px rgba(15, 23, 42, 0.15)'
            }}
            disabled={loading || submitting || !apiIsConfigured}
          >
            {loading ? 'Обновляем…' : 'Обновить'}
          </button>
        </header>

        {!apiIsConfigured && (
          <div className="empty-state">
            Укажите адрес сервера в файле .env (переменная REACT_APP_API_URL).
          </div>
        )}

        {apiIsConfigured && loading && records.length === 0 && (
          <div className="empty-state">Загружаем записи…</div>
        )}

        {apiIsConfigured && !loading && records.length === 0 && !error && (
          <div className="empty-state">Пока нет данных об обслуживании.</div>
        )}

        {lastRecords.length > 0 && (
          <ul>
            {lastRecords.map(record => (
              <li key={record.id ?? `${record.date}-${record.procedure}-${record.mileage}`}>
                <strong>{formatDisplayDate(record.date)}</strong>
                <span>{record.procedure}</span>
                <span style={{ color: '#1e3a8a', fontWeight: 600 }}>{record.mileage.toLocaleString('ru-RU')} км</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default App;
