import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Remove initial loader once React has mounted
if (typeof window.__removeInitialLoader === 'function') {
  // Small delay to ensure first render is complete
  requestAnimationFrame(() => {
    window.__removeInitialLoader();
  });
}
