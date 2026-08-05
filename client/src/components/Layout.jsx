import { NavLink, Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/grammar', label: 'Grammar' },
  { to: '/vocabulary', label: 'Vocabulary' },
  { to: '/cards', label: 'Flashcards' },
  { to: '/verbs', label: 'Verbs' },
  { to: '/quizzes', label: 'Quizzes' },
  { to: '/reading', label: 'Reading' },
  { to: '/speaking', label: 'Speaking' },
  { to: '/progress', label: 'Progress' },
  { to: '/settings', label: 'Settings' },
];

function Layout() {
  const { settings, set } = useSettings();
  const dark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [open, setOpen] = useState(false);

  // Skip-link handler: don't change the URL (HashRouter owns the hash);
  // just move keyboard focus straight to the main content region.
  function skipToMain(e) {
    e.preventDefault();
    document.getElementById('main')?.focus();
  }

  return (
    <>
      {/* Hidden off-screen until it receives keyboard focus (Tab). */}
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Skip to content
      </a>

      <header className="fv-nav">
        <nav className="container d-flex align-items-center gap-3 py-2" aria-label="Main">
          <Link to="/" className="brand text-decoration-none d-flex align-items-center gap-2">
            <span aria-hidden="true">🗼</span> French Voyage
          </Link>

          {/* Only exists below the lg breakpoint */}
          <button
            className="btn btn-sm btn-outline-secondary d-lg-none ms-auto"
            onClick={() =>
              setOpen((o) => !o)
            } /**functional update form of setState: every click flips the value  */
            aria-expanded={open}
            aria-controls="main-nav"
          >
            Menu
          </button>

          <ul
            id="main-nav"
            className={`nav flex-column flex-lg-row mb-0 ${open ? 'd-flex' : 'd-none'} d-lg-flex w-100 w-lg-auto`}
          >
            {links.map((link) => (
              /** React needs a unique key for every item in a list */ <li
                className="nav-item"
                key={link.to}
              >
                <NavLink
                  className="nav-link"
                  to={link.to}
                  end={link.end}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button
            className="btn btn-sm btn-outline-secondary ms-auto ms-lg-0 flex-shrink-0"
            onClick={() => set({ theme: dark ? 'light' : 'dark' })}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀' : '☾'}
          </button>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="container py-4 py-lg-5">
        {/* Whichever child route matched renders here */}
        <Outlet />
      </main>

      <footer className="container pb-5">
        <hr className="rule" />
        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center small text-muted-2">
          {/* Hardcoded until step 11's content loader supplies live stats */}
          <span>French Voyage — 62 grammar lessons, 669 vocabulary cards, 80 verbs.</span>
        </div>
      </footer>
    </>
  );
}

export default Layout;
