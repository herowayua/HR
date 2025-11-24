
import React from 'react';
import ReactDOM from 'react-dom/client';
import HeroWayUa_App from './HeroWayUa_App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HeroWayUa_App />
  </React.StrictMode>
);
