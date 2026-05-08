import { useEffect, useRef } from 'react';
import type { ContextMenuState, CsvAction } from './types';

interface ContextMenuProps {
  menu: ContextMenuState;
  sortedToSourceMap: number[];
  dispatch: (action: CsvAction) => void;
}

export function ContextMenu({ menu, sortedToSourceMap, dispatch }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        dispatch({ type: 'SET_CONTEXT_MENU', menu: { visible: false, x: 0, y: 0, targetCell: null } });
      }
    };
    if (menu.visible) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menu.visible, dispatch]);

  if (!menu.visible || !menu.targetCell) return null;

  const close = () => dispatch({ type: 'SET_CONTEXT_MENU', menu: { visible: false, x: 0, y: 0, targetCell: null } });

  const sourceRow = sortedToSourceMap[menu.targetCell!.row];
  const items = [
    { label: '在上方插入行', action: () => { dispatch({ type: 'INSERT_ROW', at: sourceRow }); close(); } },
    { label: '在下方插入行', action: () => { dispatch({ type: 'INSERT_ROW', at: sourceRow + 1 }); close(); } },
    { label: '删除行', action: () => { dispatch({ type: 'DELETE_ROW', at: sourceRow }); close(); } },
    { label: '---' },
    { label: '在左侧插入列', action: () => { dispatch({ type: 'INSERT_COL', at: menu.targetCell!.col }); close(); } },
    { label: '在右侧插入列', action: () => { dispatch({ type: 'INSERT_COL', at: menu.targetCell!.col + 1 }); close(); } },
    { label: '删除列', action: () => { dispatch({ type: 'DELETE_COL', at: menu.targetCell!.col }); close(); } },
  ];

  return (
    <div ref={ref} className="csv-context-menu" style={{ left: menu.x, top: menu.y }}>
      {items.map((item, idx) =>
        item.label === '---' ? (
          <div key={idx} className="csv-context-menu-divider" />
        ) : (
          <button key={idx} className="csv-context-menu-item" onClick={item.action}>
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
