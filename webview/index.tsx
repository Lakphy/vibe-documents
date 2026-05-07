import { createRoot } from 'react-dom/client';
import { App } from './App';
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';
import '@excalidraw/excalidraw/index.css';
import './styles/main.css';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
