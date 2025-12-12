/**
 * Mock Server Entry Point
 * MSW (Mock Service Worker) browser setup
 */
/// <reference types="vite/client" />
import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth';
import { clientHandlers } from './handlers/clients';

// Combine all handlers
const handlers = [
  ...authHandlers,
  ...clientHandlers,
];

// Create the worker instance
export const worker = setupWorker(...handlers);

/**
 * Start the mock server
 * Should be called before React renders in development mode
 */
export async function startMockServer() {
  // Only start in development
  if (import.meta.env.PROD) {
    console.log('[MSW] Skipping mock server in production');
    return;
  }
  
  // Check if mocking is disabled via environment variable
  if (import.meta.env.VITE_ENABLE_MOCK === 'false') {
    console.log('[MSW] Mock server disabled via VITE_ENABLE_MOCK');
    return;
  }
  
  try {
    await worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.log('[MSW] Mock server started successfully');
  } catch (error) {
    console.error('[MSW] Failed to start mock server:', error);
  }
}

export default worker;
