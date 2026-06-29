import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ColorModeProvider } from './theme/ColorModeContext';
import { AuthProvider } from './auth/AuthContext';
import { ActivityProvider } from './activity/ActivityContext';
import AppToaster from './components/AppToaster';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ColorModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ActivityProvider>
            <App />
          </ActivityProvider>
        </AuthProvider>
      </BrowserRouter>
      <AppToaster />
    </ColorModeProvider>
  </React.StrictMode>
);
