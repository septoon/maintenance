import React from 'react';

type TitleCardProps = {
  className: string;
  title: string;
  logoSrc: string;
};

const TitleCard: React.FC<TitleCardProps> = ({ className, title, logoSrc }) => (
  <section className={`${className} flex items-center justify-between`}>
    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
    <img src={logoSrc} alt="VTB" className="h-8 w-auto sm:h-6 dark:opacity-90" />
  </section>
);

export default TitleCard;
