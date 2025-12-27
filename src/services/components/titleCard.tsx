import React from 'react';

type TitleCardProps = {
  className: string;
  title: string;
};

const TitleCard: React.FC<TitleCardProps> = ({ className, title }) => (
  <section className={className}>
    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
  </section>
);

export default TitleCard;
