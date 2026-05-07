import { createRoot } from 'react-dom/client';
import { App } from './App';
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';
import './styles/theme-bridge.css';
import './styles/streamdown-controls.css';
import './styles/toolbar.css';
import './styles/milkdown-overrides.css';
import './styles/cursor-markdown.css';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
