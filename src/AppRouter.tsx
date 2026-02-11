import React from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import App from './App';
import ProfilePage from './services/components/profilePage';
import SalaryPage from './services/components/salaryPage';
import FuelPage from './services/components/fuelPage';
import MaintenancePage from './services/components/maintenancePage';

const SalaryRoute: React.FC = () => {
  const navigate = useNavigate();
  return <SalaryPage onClose={() => navigate('/')} />;
};

const ProfileRoute: React.FC = () => {
  const navigate = useNavigate();
  return <ProfilePage onClose={() => navigate('/')} />;
};

const FuelRoute: React.FC = () => {
  const navigate = useNavigate();
  return <FuelPage onClose={() => navigate('/')} />;
};

const MaintenanceRoute: React.FC = () => {
  const navigate = useNavigate();
  return <MaintenancePage onClose={() => navigate('/')} />;
};

const AppRouter: React.FC = () => (
  <BrowserRouter basename={process.env.PUBLIC_URL}>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/fuel" element={<FuelRoute />} />
      <Route path="/maintenance" element={<MaintenanceRoute />} />
      <Route path="/salary" element={<SalaryRoute />} />
      <Route path="/profile" element={<ProfileRoute />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
