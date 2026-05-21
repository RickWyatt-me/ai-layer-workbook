import { useState } from 'react';
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Section from './components/Section';
import ScrollToTop from './components/ScrollToTop';
import { HOME_SLUG, NAV_FLAT } from './data/nav';

function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const currentSlug = location.pathname.replace(/^\//, '') || HOME_SLUG;

  return (
    <div className={`app${drawerOpen ? ' drawer-open' : ''}`}>
      <Sidebar onNavigate={() => setDrawerOpen(false)} />
      <div className="main-wrap">
        <Topbar onMenuClick={() => setDrawerOpen((v) => !v)} />
        <main className="main">
          <Routes>
            <Route
              path="/"
              element={<Navigate to={`/${HOME_SLUG}`} replace />}
            />
            {NAV_FLAT.map((item) => (
              <Route
                key={item.slug}
                path={`/${item.slug}`}
                element={<Section slug={item.slug} title={item.title} />}
              />
            ))}
            <Route
              path="*"
              element={<Navigate to={`/${HOME_SLUG}`} replace />}
            />
          </Routes>
        </main>
      </div>
      <ScrollToTop key={currentSlug} />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
