
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- Service Worker Registration ---

const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    const swUrl = new URL('/sw.js', window.location.origin);
    navigator.serviceWorker.register(swUrl.href).then(
      (registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      },
      (error) => {
        console.error('Service Worker registration failed:', error);
      }
    );
  }
};

// Robust registration: Check if load event already fired
if (document.readyState === 'complete') {
  registerServiceWorker();
} else {
  window.addEventListener('load', registerServiceWorker);
}


// --- React App Mounting ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
