import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

describe('package.json 声明完整性', () => {
  describe('基础字段', () => {
    it('包含必要的元数据字段', () => {
      expect(pkg.name).toBe('vibe-documents');
      expect(pkg.displayName).toBeTruthy();
      expect(pkg.description).toBeTruthy();
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pkg.publisher).toBeTruthy();
      expect(pkg.license).toBeTruthy();
    });

    it('指定 VS Code 引擎版本', () => {
      expect(pkg.engines).toBeDefined();
      expect(pkg.engines.vscode).toMatch(/^\^/);
    });

    it('入口文件指向 dist/extension.js', () => {
      expect(pkg.main).toBe('./dist/extension.js');
    });
  });

  describe('命令声明', () => {
    const commands: Array<{ command: string; title: string }> = pkg.contributes.commands;

    it('声明了 showPreview 命令', () => {
      const cmd = commands.find(c => c.command === 'vibeDocuments.showPreview');
      expect(cmd).toBeDefined();
      expect(cmd!.title).toBeTruthy();
    });

    it('声明了 showPreviewToSide 命令', () => {
      const cmd = commands.find(c => c.command === 'vibeDocuments.showPreviewToSide');
      expect(cmd).toBeDefined();
      expect(cmd!.title).toBeTruthy();
    });

    it('声明了 toggleMode 命令', () => {
      const cmd = commands.find(c => c.command === 'vibeDocuments.toggleMode');
      expect(cmd).toBeDefined();
      expect(cmd!.title).toBeTruthy();
    });

    it('所有命令都有图标', () => {
      commands.forEach(cmd => {
        expect(cmd).toHaveProperty('icon');
      });
    });
  });

  describe('菜单配置', () => {
    it('editor/title 菜单绑定到 markdown 文件', () => {
      const menu = pkg.contributes.menus['editor/title'];
      expect(menu).toBeDefined();
      expect(menu.length).toBeGreaterThan(0);
      const mdItem = menu.find((m: any) => m.when?.includes('markdown'));
      expect(mdItem).toBeDefined();
    });

    it('explorer/context 菜单绑定到 markdown 文件', () => {
      const menu = pkg.contributes.menus['explorer/context'];
      expect(menu).toBeDefined();
      const mdItem = menu.find((m: any) => m.when?.includes('markdown'));
      expect(mdItem).toBeDefined();
    });
  });

  describe('快捷键', () => {
    it('声明了预览快捷键', () => {
      const keybindings = pkg.contributes.keybindings;
      expect(keybindings).toBeDefined();
      expect(keybindings.length).toBeGreaterThan(0);
    });

    it('快捷键绑定到 markdown 编辑器', () => {
      const binding = pkg.contributes.keybindings[0];
      expect(binding.when).toContain('markdown');
      expect(binding.command).toContain('vibeDocuments');
    });

    it('同时定义了 key 和 mac 快捷键', () => {
      const binding = pkg.contributes.keybindings[0];
      expect(binding.key).toBeTruthy();
      expect(binding.mac).toBeTruthy();
    });
  });

  describe('激活事件', () => {
    it('在打开 markdown 文件时激活', () => {
      expect(pkg.activationEvents).toContain('onLanguage:markdown');
    });
  });

  describe('核心依赖', () => {
    it('包含 react 和 react-dom', () => {
      expect(pkg.dependencies.react).toBeDefined();
      expect(pkg.dependencies['react-dom']).toBeDefined();
    });

    it('包含 streamdown 渲染库', () => {
      expect(pkg.dependencies.streamdown).toBeDefined();
    });

    it('包含所有 streamdown 插件', () => {
      expect(pkg.dependencies['@streamdown/mermaid']).toBeDefined();
      expect(pkg.dependencies['@streamdown/code']).toBeDefined();
      expect(pkg.dependencies['@streamdown/math']).toBeDefined();
      expect(pkg.dependencies['@streamdown/cjk']).toBeDefined();
    });

    it('开发依赖包含 TypeScript', () => {
      expect(pkg.devDependencies.typescript).toBeDefined();
    });

    it('开发依赖包含 webpack', () => {
      expect(pkg.devDependencies.webpack).toBeDefined();
      expect(pkg.devDependencies['webpack-cli']).toBeDefined();
    });

    it('开发依赖包含 VS Code 类型', () => {
      expect(pkg.devDependencies['@types/vscode']).toBeDefined();
    });

    it('开发依赖包含 vitest', () => {
      expect(pkg.devDependencies.vitest).toBeDefined();
    });
  });

  describe('脚本', () => {
    it('包含 build 脚本', () => {
      expect(pkg.scripts.build).toBeDefined();
    });

    it('包含 test 脚本', () => {
      expect(pkg.scripts.test).toBeDefined();
    });

    it('包含 vscode:prepublish 脚本', () => {
      expect(pkg.scripts['vscode:prepublish']).toBeDefined();
    });
  });
});

describe('项目文件完整性', () => {
  const requiredFiles = [
    'tsconfig.json',
    'webpack.config.js',
    '.gitignore',
    '.vscodeignore',
    'src/extension.ts',
    'src/previewProvider.ts',
    'src/utils.ts',
    'src/codeLensProvider.ts',
    'webview/App.tsx',
    'webview/index.tsx',
    'webview/hooks.tsx',
    'webview/Toolbar.tsx',
    'webview/MilkdownEditor.tsx',
    'webview/SourceEditor.tsx',
    'webview/ExcalidrawBlock.tsx',
    'webview/styles/main.css',
  ];

  requiredFiles.forEach(file => {
    it(`存在 ${file}`, () => {
      expect(existsSync(join(ROOT, file))).toBe(true);
    });
  });
});
