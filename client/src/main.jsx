import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';

// HashRouter, not BrowserRouter: GitHub Pages is a static host with no
// server-side rewrites, so the route must live after the # where the
// browser never sends it to the server. See LEARNING_GUIDE.md step 05.
createRoot(document.getElementById('root')).render(
  // StrictMode is a dev-only tool that warns about unsafe React patterns. It
  // is not needed in production, but it is harmless to leave in.
  //On StrictMode: in development only, it intentionally renders your components twice to help surface bugs where code has side effects that should be pure (impure state updates, unexpected mutations).
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
