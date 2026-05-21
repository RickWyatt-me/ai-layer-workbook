import { NavLink } from 'react-router-dom';
import { NAV_GROUPS, navNumber } from '../data/nav';

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  let runningIndex = 0;
  return (
    <aside className="sidebar" aria-label="Workbook sections">
      <div className="brand">
        <div className="brand-title">
          The AI Layer
          <br />
          Workbook
        </div>
        <div className="brand-sub">A field guide · v1.0</div>
      </div>

      {NAV_GROUPS.map((group) => (
        <div className="nav-section" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) => {
            const num = navNumber(runningIndex);
            runningIndex += 1;
            return (
              <NavLink
                key={item.slug}
                to={`/${item.slug}`}
                className={({ isActive }) =>
                  `nav-item${isActive ? ' active' : ''}`
                }
                onClick={onNavigate}
              >
                <span className="nav-num">{num}</span>
                <span>
                  {item.title}
                  {item.tag && <span className="tag gray"> {item.tag}</span>}
                </span>
              </NavLink>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
