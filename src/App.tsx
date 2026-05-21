import { useEffect, useRef, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Section from './components/Section';
import ScrollToTop from './components/ScrollToTop';
import { HOME_SLUG, NAV_FLAT } from './data/nav';

const FOCUSABLE_SELECTOR = 'button, a[href], [tabindex]:not([tabindex="-1"])';

function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const previouslyOpen = useRef(false);

  // Drawer side-effects: focus trap, Escape close, restore focus on close,
  // and reset drawer state when the viewport crosses to desktop.
  useEffect(() => {
    if (drawerOpen) {
      previouslyOpen.current = true;
      const sidebar = document.getElementById('sidebar-nav');
      const firstFocusable =
        sidebar?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();

      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDrawerOpen(false);
          return;
        }
        if (e.key !== 'Tab' || !sidebar) return;
        const focusables = Array.from(
          sidebar.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }

    if (previouslyOpen.current) {
      document.getElementById('menu-btn')?.focus();
    }
  }, [drawerOpen]);

  // If the viewport grows past the mobile breakpoint while the drawer is
  // open, close it so the scrim button doesn't linger in the a11y tree.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 901px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

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
