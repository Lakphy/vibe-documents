import { useEffect, useRef, type RefObject } from 'react';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]';
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

function isSelectAllShortcut(event: KeyboardEvent) {
  return (
    event.key.toLowerCase() === 'a' &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

function getElementFromTarget(target: EventTarget | Node | null): Element | null {
  if (!target) return null;
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isEditableTarget(target: EventTarget | null) {
  const element = getElementFromTarget(target);
  const editable = element?.closest(EDITABLE_SELECTOR);
  if (!editable) return false;

  if (editable instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(editable.type);
  }

  if (editable instanceof HTMLElement && editable.hasAttribute('contenteditable')) {
    return editable.getAttribute('contenteditable') !== 'false';
  }

  return true;
}

function findCodeBlock(element: Element | null, container: HTMLElement) {
  const block = element?.closest('pre');
  if (!(block instanceof HTMLElement)) return null;
  return container.contains(block) ? block : null;
}

function findCodeBlockFromSelection(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const anchorBlock = findCodeBlock(getElementFromTarget(selection.anchorNode), container);
  const focusBlock = findCodeBlock(getElementFromTarget(selection.focusNode), container);

  if (anchorBlock && (!focusBlock || focusBlock === anchorBlock)) return anchorBlock;
  if (focusBlock && selection.isCollapsed) return focusBlock;
  return null;
}

function getSelectableCodeElement(block: HTMLElement) {
  return block.querySelector('code') ?? block;
}

function isFullCodeBlockSelection(block: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount !== 1) return false;

  const selectedRange = selection.getRangeAt(0);
  const targetRange = document.createRange();
  targetRange.selectNodeContents(getSelectableCodeElement(block));

  return (
    selectedRange.compareBoundaryPoints(Range.START_TO_START, targetRange) === 0 &&
    selectedRange.compareBoundaryPoints(Range.END_TO_END, targetRange) === 0
  );
}

function selectCodeBlockContents(block: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return false;

  const range = document.createRange();
  range.selectNodeContents(getSelectableCodeElement(block));
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export function useCodeBlockSelectAll(containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const focusedCodeBlockRef = useRef<HTMLElement | null>(null);
  const selectedByShortcutRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const getContainer = () => containerRef.current;

    const updateFocusedCodeBlock = (target: EventTarget | null) => {
      const container = getContainer();
      if (!container || isEditableTarget(target)) {
        focusedCodeBlockRef.current = null;
        selectedByShortcutRef.current = null;
        return;
      }

      focusedCodeBlockRef.current = findCodeBlock(getElementFromTarget(target), container);
      selectedByShortcutRef.current = null;
    };

    const handleSelectionChange = () => {
      const selectedBlock = selectedByShortcutRef.current;
      if (selectedBlock && !isFullCodeBlockSelection(selectedBlock)) {
        selectedByShortcutRef.current = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isSelectAllShortcut(event) || isEditableTarget(event.target)) return;

      const container = getContainer();
      if (!container) return;

      const codeBlock = findCodeBlockFromSelection(container) ?? focusedCodeBlockRef.current;
      if (!codeBlock || !container.contains(codeBlock)) return;

      if (selectedByShortcutRef.current === codeBlock && isFullCodeBlockSelection(codeBlock)) {
        focusedCodeBlockRef.current = null;
        selectedByShortcutRef.current = null;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (selectCodeBlockContents(codeBlock)) {
        focusedCodeBlockRef.current = codeBlock;
        selectedByShortcutRef.current = codeBlock;
      }
    };

    const handlePointerDown = (event: Event) => updateFocusedCodeBlock(event.target);
    const handleFocusIn = (event: Event) => updateFocusedCodeBlock(event.target);

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [containerRef, enabled]);
}
