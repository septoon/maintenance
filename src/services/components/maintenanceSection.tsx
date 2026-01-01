import React, { useState } from 'react';
import { MaintenanceRecord } from '../../types';

type MaintenanceSectionProps = {
  className: string;
  noticeClass: string;
  refreshButtonClass: string;
  lastRecords: MaintenanceRecord[];
  recordsCount: number;
  loading: boolean;
  submitting: boolean;
  apiIsConfigured: boolean;
  onRefresh: () => void;
};

function formatDisplayDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

const intervalByProcedure: Record<string, number> = {
  'Замена масла': 6000,
  'Замена свечей': 20000,
  'Замена колодок': 40000
};

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({
  className,
  noticeClass,
  refreshButtonClass,
  lastRecords,
  recordsCount,
  loading,
  submitting,
  apiIsConfigured,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={className}>
      <header className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="flex flex-1 items-center justify-between text-left"
          aria-expanded={isExpanded}
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Записи СТО
          </h2>
          <i
            className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-slate-600 dark:text-slate-300`}
          />
        </button>
      </header>

    {!apiIsConfigured && (
      <div className={noticeClass}>
        Укажите адрес сервера в файле .env (переменная REACT_APP_API_URL).
      </div>
    )}

    {apiIsConfigured && loading && recordsCount === 0 && (
      <div className={noticeClass}>Загружаем записи…</div>
    )}

    {apiIsConfigured && !loading && recordsCount === 0 && (
      <div className={noticeClass}>Пока нет данных об обслуживании.</div>
    )}

      {isExpanded && lastRecords.length > 0 && (
        <ul className="mt-4 space-y-3">
          {lastRecords.map(record => {
            const interval = intervalByProcedure[record.procedure];
            const nextMileage = typeof interval === 'number' ? record.mileage + interval : null;

            return (
              <li
                key={record.id ?? `${record.date}-${record.procedure}-${record.mileage}`}
                className="grid gap-1 rounded-2xl border border-slate-900/10 bg-slate-50/90 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70"
              >
                <strong className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {formatDisplayDate(record.date)}
                </strong>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <span>{record.procedure} - </span>
                  <span className="font-semibold text-blue-900 dark:text-blue-300">
                    {record.mileage.toLocaleString('ru-RU')} км
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <span>След. замена ~ </span>
                  {nextMileage !== null ? (
                    <span className="font-semibold text-blue-900 dark:text-blue-300">
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
  );
};

export default MaintenanceSection;
