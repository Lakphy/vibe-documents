import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CellRenderer } from '../csv/CellRenderer';

const defaultProps = {
  row: 0,
  col: 0,
  value: 'test',
  width: 100,
  height: 30,
  isSelected: false,
  isActive: false,
  isEditing: false,
  isSearchMatch: false,
  isCurrentMatch: false,
  onMouseDown: vi.fn(),
  onMouseEnter: vi.fn(),
  onDoubleClick: vi.fn(),
  onContextMenu: vi.fn(),
};

describe('CellRenderer', () => {
  describe('className 逻辑', () => {
    it('默认只有 csv-cell 类', () => {
      const { container } = render(<CellRenderer {...defaultProps} />);
      const cell = container.firstChild as HTMLElement;
      expect(cell.className).toBe('csv-cell');
    });

    it('isSelected 时添加 csv-cell--selected', () => {
      const { container } = render(<CellRenderer {...defaultProps} isSelected={true} />);
      const cell = container.firstChild as HTMLElement;
      expect(cell.className).toContain('csv-cell--selected');
    });

    it('isActive 时添加 csv-cell--active', () => {
      const { container } = render(<CellRenderer {...defaultProps} isActive={true} />);
      const cell = container.firstChild as HTMLElement;
      expect(cell.className).toContain('csv-cell--active');
    });

    it('isEditing 时添加 csv-cell--editing', () => {
      const { container } = render(<CellRenderer {...defaultProps} isEditing={true} />);
      const cell = container.firstChild as HTMLElement;
      expect(cell.className).toContain('csv-cell--editing');
    });

    it('isSearchMatch 时添加 csv-cell--search-match', () => {
      const { container } = render(<CellRenderer {...defaultProps} isSearchMatch={true} />);
      const cell = container.firstChild as HTMLElement;
      expect(cell.className).toContain('csv-cell--search-match');
    });

    it('isCurrentMatch 时添加 csv-cell--current-match', () => {
      const { container } = render(<CellRenderer {...defaultProps} isCurrentMatch={true} />);
      const cell = container.firstChild as HTMLElement;
      expect(cell.className).toContain('csv-cell--current-match');
    });

    it('多个状态同时生效', () => {
      const { container } = render(
        <CellRenderer {...defaultProps} isSelected={true} isActive={true} isSearchMatch={true} />
      );
      const cell = container.firstChild as HTMLElement;
      expect(cell.className).toContain('csv-cell--selected');
      expect(cell.className).toContain('csv-cell--active');
      expect(cell.className).toContain('csv-cell--search-match');
    });
  });

  describe('内容渲染', () => {
    it('显示单元格文本', () => {
      render(<CellRenderer {...defaultProps} value="Hello World" />);
      expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('编辑态不渲染底层单元格文本', () => {
      render(<CellRenderer {...defaultProps} value="Hidden while editing" isEditing={true} />);
      expect(screen.queryByText('Hidden while editing')).toBeNull();
    });

    it('应用正确的宽高样式', () => {
      const { container } = render(
        <CellRenderer {...defaultProps} width={150} height={40} />
      );
      const cell = container.firstChild as HTMLElement;
      expect(cell.style.width).toBe('150px');
      expect(cell.style.height).toBe('40px');
      expect(cell.style.minWidth).toBe('150px');
    });
  });

  describe('事件传递', () => {
    it('mouseDown 传递 {row, col} 和事件', () => {
      const onMouseDown = vi.fn();
      const { container } = render(
        <CellRenderer {...defaultProps} row={2} col={3} onMouseDown={onMouseDown} />
      );
      fireEvent.mouseDown(container.firstChild!);
      expect(onMouseDown).toHaveBeenCalledWith(
        { row: 2, col: 3 },
        expect.any(Object)
      );
    });

    it('mouseEnter 传递 {row, col}', () => {
      const onMouseEnter = vi.fn();
      const { container } = render(
        <CellRenderer {...defaultProps} row={1} col={2} onMouseEnter={onMouseEnter} />
      );
      fireEvent.mouseEnter(container.firstChild!);
      expect(onMouseEnter).toHaveBeenCalledWith({ row: 1, col: 2 });
    });

    it('doubleClick 传递 {row, col}', () => {
      const onDoubleClick = vi.fn();
      const { container } = render(
        <CellRenderer {...defaultProps} row={0} col={1} onDoubleClick={onDoubleClick} />
      );
      fireEvent.doubleClick(container.firstChild!);
      expect(onDoubleClick).toHaveBeenCalledWith({ row: 0, col: 1 });
    });

    it('contextMenu 阻止默认行为并传递 {row, col}', () => {
      const onContextMenu = vi.fn();
      const { container } = render(
        <CellRenderer {...defaultProps} row={0} col={0} onContextMenu={onContextMenu} />
      );
      const event = new MouseEvent('contextmenu', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      container.firstChild!.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(onContextMenu).toHaveBeenCalledWith(
        { row: 0, col: 0 },
        expect.any(Object)
      );
    });
  });

  describe('memo 优化', () => {
    it('相同 props 不重新渲染', () => {
      const renderSpy = vi.fn();
      const SpyCell = React.memo(function SpyCell(props: any) {
        renderSpy();
        return <CellRenderer {...props} />;
      });

      const props = { ...defaultProps };
      const { rerender } = render(<SpyCell {...props} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      rerender(<SpyCell {...props} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('布尔 prop 变化时重新渲染', () => {
      let renderCount = 0;
      const WrappedCell = (props: any) => {
        renderCount++;
        return <CellRenderer {...props} />;
      };

      const { rerender } = render(<WrappedCell {...defaultProps} isSelected={false} />);
      expect(renderCount).toBe(1);

      rerender(<WrappedCell {...defaultProps} isSelected={true} />);
      expect(renderCount).toBe(2);
    });
  });
});
