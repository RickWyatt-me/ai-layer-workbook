import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Section from './components/Section';
import ScrollToTop from './components/ScrollToTop';
import { HOME_SLUG, NAV_FLAT } from './data/nav';

function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  return (
    <div className={`app${drawerOpen ? ' drawer-open' : ''}`}>
      <Sidebar onNavigate={() => setDrawerOpen(false)} />
      <div className="main-wrap">
        <Topbar
          drawerOpen={drawerOpen}
          onMenuClick={() => setDrawerOpen((v) => !v)}
        />
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
      {drawerOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <ScrollToTop />
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
