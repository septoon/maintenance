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
  onEditRecord: (record: MaintenanceRecord) => void;
};

function formatDisplayDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatMoney(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
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
  onRefresh,
  onEditRecord
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

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
            const parts = Array.isArray(record.parts) ? record.parts : [];
            const canEdit = Boolean(record.id);
            const partsCost = parts.reduce((sum, part) => sum + (part.cost ?? 0), 0);
            const hasParts = parts.length > 0;
            const hasWorkCost = record.workCost !== null && record.workCost !== undefined;
            const totalCost =
              record.totalCost !== null && record.totalCost !== undefined
                ? record.totalCost
                : hasParts || hasWorkCost
                  ? partsCost + (record.workCost ?? 0)
                  : null;

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
                {hasParts ? (
                  <>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Запчасти:</div>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    {parts.map((part, index) => (
                      <div
                        key={`${record.id ?? record.date}-${index}-${part.name}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-900/10 bg-white/60 px-2 py-1 dark:border-slate-700/60 dark:bg-slate-900/50"
                      >
                        <span className="truncate">{part.name}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatMoney(part.cost)} ₽
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span>Итого запчасти</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(partsCost)} ₽
                      </span>
                    </div>
                  </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <span>Запчасти</span>
                    <span>не указано</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span>Работа</span>
                  {hasWorkCost ? (
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatMoney(record.workCost ?? 0)} ₽
                    </span>
                  ) : (
                    <span>не указано</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span>Итог</span>
                  {totalCost !== null ? (
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatMoney(totalCost)} ₽
                    </span>
                  ) : (
                    <span>не указано</span>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onEditRecord(record)}
                    disabled={submitting || !canEdit}
                    title={
                      canEdit
                        ? 'Редактировать запись'
                        : 'У записи нет id. Добавьте id в JSON, чтобы включить редактирование.'
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-900/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
                  >
                    <i className="pi pi-pencil text-xs" />
                    Редактировать
                  </button>
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
