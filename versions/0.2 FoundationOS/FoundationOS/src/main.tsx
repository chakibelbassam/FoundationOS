import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import { App } from './app/App';
import { ServerProvider } from './app/ServerContext';
import { SessionProvider } from './app/SessionContext';
import { PreferencesProvider } from './app/PreferencesContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ServerProvider>
        <SessionProvider>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </SessionProvider>
      </ServerProvider>
    </BrowserRouter>
  </StrictMode>,
);
