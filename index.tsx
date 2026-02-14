import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Could not find root element with id 'root' in the DOM.");
    }

    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("SapiSoft ERP: Application Mounted Successfully");
} catch (error) {
    console.error("SapiSoft ERP: Critical Mounting Error:", error);
    // This will bubble up and be caught by the global error handler in index.html
    throw error;
}