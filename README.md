# Vibe Documents

> A beautiful Markdown preview extension inspired by Cursor's rendering style, with Mermaid, KaTeX, Shiki code highlighting and more.

## Features

| Feature | Description |
|---------|-------------|
| **Preview Mode** | Read-only rendering based on Streamdown, perfectly replicating the Cursor style |
| **WYSIWYG Mode** | Rich text editing based on Milkdown (ProseMirror), with math formula and Mermaid support |
| **Source Mode** | Pure text editing based on CodeMirror 6, with line numbers and syntax highlighting |
| **Two-way Sync** | Webview edits write back to files in real-time; file changes push to Webview instantly |
| **Mermaid Diagrams** | Flowcharts, sequence diagrams, Gantt charts, and more |
| **KaTeX Math** | Inline `$...$` and block `$$...$$` formulas |
| **Shiki Code Highlighting** | Dual theme support (github-light / github-dark), auto-follows VS Code theme |
| **CJK Typography** | Optimized line-breaking and spacing for Chinese, Japanese, and Korean text |

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open any Markdown file
3. Use `Cmd+Shift+V` (macOS) / `Ctrl+Shift+V` (Windows/Linux) to open preview
4. Use `Cmd+Shift+E` / `Ctrl+Shift+E` to toggle between Preview / WYSIWYG / Source modes

## Commands

- **Vibe: Open Markdown Preview** — Open preview in current editor group
- **Vibe: Open Markdown Preview to the Side** — Open preview in a side panel
- **Vibe: Toggle Preview/Edit Mode** — Cycle through Preview → WYSIWYG → Source modes

## Tech Stack

- **Extension Host**: TypeScript + VS Code API
- **Webview**: React 19 + Streamdown + Milkdown (ProseMirror) + CodeMirror 6
- **Rendering**: KaTeX (math) + Mermaid (diagrams) + Shiki (code highlighting)
- **Build**: Webpack 5 + ts-loader
- **Test**: Vitest + jsdom + React Testing Library

## License

[MIT](LICENSE)
