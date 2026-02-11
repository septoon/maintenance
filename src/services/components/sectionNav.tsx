import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type SectionNavProps = {
  className?: string;
};

const SECTION_LINKS = [
  { to: '/', label: 'Главная', hint: 'Профиль и авто', icon: 'pi-home' },
  { to: '/fuel', label: 'Топливо', hint: 'Расход и нормы', icon: 'pi-bolt' },
  { to: '/maintenance', label: 'СТО', hint: 'История и записи', icon: 'pi-car' },
  { to: '/salary', label: 'Зарплата', hint: 'Начисления', icon: 'pi-calculator' }
];

const SectionNav: React.FC<SectionNavProps> = ({ className = '' }) => {
  const location = useLocation();

  return (
    <section className={className}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTION_LINKS.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-3xl border p-3 transition-all ${
                isActive
                  ? 'border-transparent bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]'
                  : 'border-white/60 bg-white/85 text-slate-800 shadow-card backdrop-blur-lg hover:-translate-y-0.5 hover:border-blue-300/70 hover:shadow-lg dark:border-slate-800/70 dark:bg-slate-900/85 dark:text-slate-100 dark:hover:border-blue-400/40'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-900/10 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                }`}
              >
                <i className={`pi ${link.icon} text-base`} aria-hidden="true" />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{link.label}</span>
                <span
                  className={`block truncate text-xs ${
                    isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {link.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default SectionNav;
