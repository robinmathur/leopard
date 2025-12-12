import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * Initialize and render the application
 * Starts mock server in development mode before rendering
 */
async function initApp() {
  // Start mock server in development
  if (import.meta.env.DEV) {
    const { startMockServer } = await import('../dev/mock-server/index');
    await startMockServer();
  }

  // Render the application
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Initialize the app
initApp();
