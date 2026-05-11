import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar, type EditorMode } from '../Toolbar';

describe('Toolbar', () => {
  it('只渲染预览和编辑两个模式按钮', () => {
    render(<Toolbar mode="preview" onModeChange={() => {}} />);
    expect(screen.getByTitle('预览')).toBeInTheDocument();
    expect(screen.getByTitle('编辑')).toBeInTheDocument();
    expect(screen.queryByTitle('源码')).toBeNull();
  });

  it('当前模式按钮有 active 样式', () => {
    render(<Toolbar mode="wysiwyg" onModeChange={() => {}} />);
    const editBtn = screen.getByTitle('编辑');
    expect(editBtn.style.boxShadow).toBeTruthy();
    const previewBtn = screen.getByTitle('预览');
    expect(previewBtn.style.background).toBe('transparent');
  });

  it('点击按钮触发 onModeChange', () => {
    const onModeChange = vi.fn();
    render(<Toolbar mode="preview" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByTitle('编辑'));
    expect(onModeChange).toHaveBeenCalledWith('wysiwyg');
  });

  it('每个模式都能高亮对应按钮', () => {
    const modes: EditorMode[] = ['preview', 'wysiwyg'];
    const titles = ['预览', '编辑'];

    modes.forEach((mode, i) => {
      const { unmount } = render(<Toolbar mode={mode} onModeChange={() => {}} />);
      const btn = screen.getByTitle(titles[i]);
      expect(btn.style.boxShadow).toBeTruthy();
      unmount();
    });
  });
});
