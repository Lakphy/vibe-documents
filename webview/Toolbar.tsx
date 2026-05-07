import { Eye, PenLine, Code } from 'lucide-react';
import type { ReactNode } from 'react';

export type EditorMode = 'preview' | 'wysiwyg' | 'source';

interface ToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

const MODES: { key: EditorMode; label: string; icon: ReactNode }[] = [
  { key: 'preview', label: '预览', icon: <Eye size={14} /> },
  { key: 'wysiwyg', label: '编辑', icon: <PenLine size={14} /> },
  { key: 'source', label: '源码', icon: <Code size={14} /> },
];

export function Toolbar({ mode, onModeChange }: ToolbarProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-end px-3 py-1.5 border-b border-cursor-stroke-tertiary backdrop-blur-sm" style={{ backgroundColor: 'var(--color-vsc-bg)' }}>
      <div className="flex gap-0.5 rounded-md p-0.5" style={{ background: 'var(--color-cursor-bg-tertiary)' }}>
        {MODES.map(m => (
          <button
            key={m.key}
            className={`flex items-center gap-1 px-2.5 py-1 border-none rounded-sm text-xs cursor-pointer transition-all duration-150 whitespace-nowrap leading-none ${
              mode === m.key
                ? 'text-cursor-text-primary shadow-sm'
                : 'text-cursor-text-tertiary bg-transparent hover:text-cursor-text-primary'
            }`}
            style={mode === m.key ? {
              color: 'var(--color-cursor-text-primary)',
              background: 'var(--color-vsc-bg)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            } : {
              color: 'var(--color-cursor-text-tertiary)',
              background: 'transparent',
            }}
            onClick={() => onModeChange(m.key)}
            title={m.label}
          >
            <span className="leading-none">{m.icon}</span>
            <span className="text-[11px] font-medium">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
