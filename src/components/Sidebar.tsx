import { NavLink } from 'react-router-dom';
import { NAV_GROUPS, NAV_NUMBERS } from '../data/nav';

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <aside id="sidebar-nav" className="sidebar" aria-label="Workbook sections">
      <div className="brand">
        <div>
          <div className="brand-title">
            The AI Layer
            <br />
            Workbook
          </div>
          <div className="brand-sub">A field guide · v1.0</div>
        </div>
        <button
          type="button"
          className="drawer-close icon-btn"
          aria-label="Close navigation menu"
          onClick={() => onNavigate?.()}
        >
          ✕
        </button>
      </div>

      {NAV_GROUPS.map((group) => (
        <div className="nav-section" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) => (
            <NavLink
              key={item.slug}
              to={`/${item.slug}`}
              className={({ isActive }) =>
                `nav-item${isActive ? ' active' : ''}`
              }
              onClick={onNavigate}
            >
              <span className="nav-num">{NAV_NUMBERS[item.slug]}</span>
              <span>
                {item.title}
                {item.tag && <span className="tag gray"> {item.tag}</span>}
              </span>
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
