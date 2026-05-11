import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const ThemeContext = createContext(false);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() =>
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(
        document.body.classList.contains('vscode-dark') ||
        document.body.classList.contains('vscode-high-contrast')
      );
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return <ThemeContext.Provider value={isDark}>{children}</ThemeContext.Provider>;
}

export function useIsDark(): boolean {
  return useContext(ThemeContext);
}
