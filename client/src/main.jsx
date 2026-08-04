// Fonts are self-hosted from npm (@fontsource), not linked from a CDN:
// the app is offline-first, so type must not depend on the network.
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

// Bootstrap (with our overrides) + tokens + every component class. Once, here.
import './styles/theme.scss';

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
