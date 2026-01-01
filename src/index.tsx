import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import AppRouter from './AppRouter';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);

serviceWorkerRegistration.register();
