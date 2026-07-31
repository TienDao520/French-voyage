import { NavLink, Outlet } from 'react-router-dom';

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
  return (
    <div>
      <header>
        <h1>🗼 French Voyage</h1>
        <nav>
          {links.map((link) => (
            //loops over every element in an array and creates something new
            //NavLink knows whether its own to matches the current URL and exposes that as isActive in a render-prop style, which is how you bold the current page in nav without hand-rolling that logic
            <NavLink
              key={link.to}
              to={link.to}
              //emd: Only match the URL exactly - Home page only
              end={link.end}
              //the style is a function - ({ isActive }) is JavaScript destructuring.
              style={({ isActive }) => ({
                marginRight: '1rem',
                // the active page becomes bold automatically.
                fontWeight: isActive ? 'bold' : 'normal',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main style={{ padding: '1.5rem' }}>
        {/* Whichever child route matched renders here */}
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
