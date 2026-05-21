import type { ReactNode } from 'react';
import { useChecklist } from '../hooks/useChecklist';

export interface ChecklistItemData {
  id: string;
  label: ReactNode;
}

interface ChecklistProps {
  items: ChecklistItemData[];
}

export default function Checklist({ items }: ChecklistProps) {
  const { isChecked, toggle } = useChecklist();
  return (
    <ul className="checklist">
      {items.map((item) => {
        const checked = isChecked(item.id);
        return (
          <li key={item.id} className={checked ? 'done' : undefined}>
            <input
              type="checkbox"
              id={item.id}
              checked={checked}
              onChange={() => toggle(item.id)}
            />
            <label htmlFor={item.id}>{item.label}</label>
          </li>
        );
      })}
    </ul>
  );
}
