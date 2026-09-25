import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app/AppProviders';
import { createQueryClient } from '@/app/query-client';
import { createAppRouter } from '@/app/router';
import '@/core/config/public-env';
import '@/core/design/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');

createRoot(root).render(
  <StrictMode>
    <AppProviders
      queryClient={createQueryClient()}
      router={createAppRouter()}
    />
  </StrictMode>,
);
