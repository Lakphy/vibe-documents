export type EditorMode = 'preview' | 'wysiwyg' | 'source';

interface ToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

const MODES: { key: EditorMode; label: string; icon: string }[] = [
  { key: 'preview', label: '预览', icon: '👁' },
  { key: 'wysiwyg', label: '编辑', icon: '✏️' },
  { key: 'source', label: '源码', icon: '</>' },
];

export function Toolbar({ mode, onModeChange }: ToolbarProps) {
  return (
    <div className="vd-toolbar">
      <div className="vd-toolbar-group">
        {MODES.map(m => (
          <button
            key={m.key}
            className={`vd-toolbar-btn ${mode === m.key ? 'vd-toolbar-btn--active' : ''}`}
            onClick={() => onModeChange(m.key)}
            title={m.label}
          >
            <span className="vd-toolbar-icon">{m.icon}</span>
            <span className="vd-toolbar-label">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
