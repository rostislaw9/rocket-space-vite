import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/contexts/auth-provider';
import { BreadCrumbsProvider } from '@/contexts/breadcrumbs-context';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { PreferencesProvider } from './contexts/preferences-provider';
import AppRoutes from './routes/AppRoutes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <BreadCrumbsProvider>
              <AppRoutes />
              <Toaster richColors position="top-center" />
            </BreadCrumbsProvider>
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
