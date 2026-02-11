import React from 'react';

type BottomNavProps = {
  onOpenMaintenance: () => void;
};

const BottomNav: React.FC<BottomNavProps> = ({ onOpenMaintenance }) => (
  <nav className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-3 shadow-card backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
    <button
      type="button"
      onClick={onOpenMaintenance}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-button transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      aria-label="Открыть страницу СТО"
    >
      <i className="pi pi-car text-xl" />
    </button>
  </nav>
);

export default BottomNav;
