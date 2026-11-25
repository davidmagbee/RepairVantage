import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TimeZoneProvider } from './context/TimeZoneContext';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <TimeZoneProvider><AuthProvider>
        <App />
      </AuthProvider></TimeZoneProvider>
    </BrowserRouter>
  </StrictMode>,
);
