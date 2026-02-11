import React from 'react';
import { useNavigate } from 'react-router-dom';
import TitleCard from './services/components/titleCard';
import VehicleInfoCard from './services/components/vehicleInfoCard';
import SectionNav from './services/components/sectionNav';
import VTB from './assets/VTB_Logo.png';

const App: React.FC = () => {
  const navigate = useNavigate();

  const cardClass =
    'rounded-3xl border border-white/40 bg-white/85 p-6 shadow-card backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]';

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 pb-20 pt-[calc(env(safe-area-inset-top,0)+.2rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top,0)+2rem)]">
        <TitleCard
          logoSrc={VTB}
          className={cardClass}
          title="Тигран"
          onTitleClick={() => navigate('/profile')}
        />

        <SectionNav />

        <VehicleInfoCard className={cardClass} />
      </main>
    </div>
  );
};

export default App;
