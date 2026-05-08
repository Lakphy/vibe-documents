import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useIsDark } from '../ThemeContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeContext', () => {
  let originalClassList: string;

  beforeEach(() => {
    originalClassList = document.body.className;
  });

  afterEach(() => {
    document.body.className = originalClassList;
  });

  describe('useIsDark', () => {
    it('body 含 vscode-dark 时返回 true', () => {
      document.body.className = 'vscode-dark';
      const { result } = renderHook(() => useIsDark(), { wrapper });
      expect(result.current).toBe(true);
    });

    it('body 含 vscode-high-contrast 时返回 true', () => {
      document.body.className = 'vscode-high-contrast';
      const { result } = renderHook(() => useIsDark(), { wrapper });
      expect(result.current).toBe(true);
    });

    it('body 含 vscode-light 时返回 false', () => {
      document.body.className = 'vscode-light';
      const { result } = renderHook(() => useIsDark(), { wrapper });
      expect(result.current).toBe(false);
    });

    it('body 无相关 class 时返回 false', () => {
      document.body.className = '';
      const { result } = renderHook(() => useIsDark(), { wrapper });
      expect(result.current).toBe(false);
    });
  });

  describe('MutationObserver 响应', () => {
    it('body class 从 light 切换到 dark 时 isDark 变为 true', async () => {
      document.body.className = 'vscode-light';
      const { result } = renderHook(() => useIsDark(), { wrapper });
      expect(result.current).toBe(false);

      await act(async () => {
        document.body.className = 'vscode-dark';
        await new Promise(r => setTimeout(r, 50));
      });

      expect(result.current).toBe(true);
    });

    it('body class 从 dark 切换到 light 时 isDark 变为 false', async () => {
      document.body.className = 'vscode-dark';
      const { result } = renderHook(() => useIsDark(), { wrapper });
      expect(result.current).toBe(true);

      await act(async () => {
        document.body.className = 'vscode-light';
        await new Promise(r => setTimeout(r, 50));
      });

      expect(result.current).toBe(false);
    });
  });

  describe('无 Provider 时的默认值', () => {
    it('未包裹 ThemeProvider 时返回 false', () => {
      const { result } = renderHook(() => useIsDark());
      expect(result.current).toBe(false);
    });
  });
});
