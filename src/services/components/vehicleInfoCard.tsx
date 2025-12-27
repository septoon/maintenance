import React, { useState } from 'react';

type VehicleInfoCardProps = {
  className: string;
};

const vehicleInfo = [
  { label: 'Госномер:', value: 'М542ТМ 82' },
  { label: 'VIN:', value: 'Z94C241BBJR037440' },
  { label: 'СТС:', value: '99 84 824631' },
  { label: 'ПТС:', value: '82 РУ 074120' },
  { label: 'Цвет кузова (кабины):', value: 'Белый' },
  { label: 'Объем двигателя (см³):', value: '1591' },
  { label: 'Мощность (л.с.):', value: '123' }
];

const VehicleInfoCard: React.FC<VehicleInfoCardProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={isExpanded}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Kia Rio IV - Информация
        </h2>
        <i
          className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-slate-600 dark:text-slate-300`}
        />
      </button>
      {isExpanded && (
        <dl className="mt-5 space-y-5">
          {vehicleInfo.map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <dt className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {item.label}
              </dt>
              <dd className="text-base text-slate-900 dark:text-slate-100">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};

export default VehicleInfoCard;
