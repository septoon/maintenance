import React from 'react';

type TitleCardProps = {
  className: string;
  title: string;
  logoSrc: string;
  onTitleClick?: () => void;
};

const TitleCard: React.FC<TitleCardProps> = ({ className, title, logoSrc, onTitleClick }) => (
  <section className={`${className} flex items-center justify-between`}>
    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
      {onTitleClick ? (
        <button
          type="button"
          onClick={onTitleClick}
          className="text-left text-slate-900 transition-colors hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 dark:text-slate-100 dark:hover:text-slate-200 dark:focus-visible:outline-slate-500"
          aria-label="Открыть профиль"
        >
          {title} <i className="pi pi-chevron-right text-lg font-bold" />
        </button>
      ) : (
        title
      )}
    </h1>
    <img src={logoSrc} alt="VTB" className="h-8 w-auto sm:h-6 dark:opacity-90" />
  </section>
);

export default TitleCard;
