import { useEffect, useRef } from 'react';
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core';
import {
  blockquoteAttr,
  bulletListAttr,
  commonmark,
  codeBlockSchema,
  headingAttr,
  hrAttr,
  imageSchema,
  inlineCodeAttr,
  linkAttr,
  listItemAttr,
  orderedListAttr,
  strongAttr,
} from '@milkdown/kit/preset/commonmark';
import {
  gfm,
  strikethroughAttr,
  tableCellSchema,
  tableHeaderRowSchema,
  tableHeaderSchema,
  tableRowSchema,
  tableSchema,
} from '@milkdown/kit/preset/gfm';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { history } from '@milkdown/kit/plugin/history';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { indent } from '@milkdown/kit/plugin/indent';
import { trailing } from '@milkdown/kit/plugin/trailing';
import { replaceAll, getMarkdown } from '@milkdown/kit/utils';
import { $view } from '@milkdown/kit/utils';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { getVsCodeApi } from './vscodeApi';
import { subscribe } from './messageBus';
import { createEditableCodeBlockView } from './editableCodeBlockNodeView';
import { resolveImageSrc } from '../src/utils';
import { useSaveContentProvider } from './saveShortcut';

const STREAMDOWN_HEADING_CLASSES: Record<number, string> = {
  1: 'mt-6 mb-2 font-semibold text-3xl',
  2: 'mt-6 mb-2 font-semibold text-2xl',
  3: 'mt-6 mb-2 font-semibold text-xl',
  4: 'mt-6 mb-2 font-semibold text-lg',
  5: 'mt-6 mb-2 font-semibold text-base',
  6: 'mt-6 mb-2 font-semibold text-sm',
};

const STREAMDOWN_LIST_CLASSES = {
  ordered: 'list-inside list-decimal whitespace-normal [li_&]:pl-6',
  unordered: 'list-inside list-disc whitespace-normal [li_&]:pl-6',
  item: 'py-1 [&>p]:inline',
};

const codeBlockNodeView = $view(codeBlockSchema.node, () => {
  return createEditableCodeBlockView();
});

const tableNodeView = $view(tableSchema.node, () => {
  return (node) => {
    const container = document.createElement('div');
    container.className = 'markdown-table-container markdown-edit-table-container';

    const wrapper = document.createElement('div');
    wrapper.className = 'markdown-table-wrapper';

    const table = document.createElement('table');
    table.className = 'markdown-table';

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);

    return {
      dom: container,
      contentDOM: tbody,
      update(updatedNode) {
        return updatedNode.type.name === node.type.name;
      },
    };
  };
});

const tableHeaderRowNodeView = $view(tableHeaderRowSchema.node, () => {
  return (node) => {
    const tr = document.createElement('tr');
    tr.className = 'border-border markdown-edit-table-header-row';
    tr.setAttribute('data-is-header', 'true');
    tr.setAttribute('data-streamdown', 'table-row');

    return {
      dom: tr,
      contentDOM: tr,
      update(updatedNode) {
        return updatedNode.type.name === node.type.name;
      },
    };
  };
});

const tableRowNodeView = $view(tableRowSchema.node, () => {
  return (node) => {
    const tr = document.createElement('tr');
    tr.className = 'border-border markdown-edit-table-row';
    tr.setAttribute('data-streamdown', 'table-row');

    return {
      dom: tr,
      contentDOM: tr,
      update(updatedNode) {
        return updatedNode.type.name === node.type.name;
      },
    };
  };
});

const tableHeaderNodeView = $view(tableHeaderSchema.node, () => {
  return (node) => {
    const th = document.createElement('th');
    th.className = 'whitespace-nowrap px-4 py-2 text-left font-semibold text-sm markdown-edit-table-header-cell';
    th.setAttribute('data-streamdown', 'table-header-cell');

    return {
      dom: th,
      contentDOM: th,
      update(updatedNode) {
        return updatedNode.type.name === node.type.name;
      },
    };
  };
});

const tableCellNodeView = $view(tableCellSchema.node, () => {
  return (node) => {
    const td = document.createElement('td');
    td.className = 'px-4 py-2 text-sm markdown-edit-table-cell';
    td.setAttribute('data-streamdown', 'table-cell');

    return {
      dom: td,
      contentDOM: td,
      update(updatedNode) {
        return updatedNode.type.name === node.type.name;
      },
    };
  };
});

function createImageNodeView(baseUri: string) {
  return $view(imageSchema.node, () => {
    return (node) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'group relative my-4 inline-block markdown-edit-image-wrapper';
      wrapper.setAttribute('data-streamdown', 'image-wrapper');

      const img = document.createElement('img');
      img.className = 'max-w-full rounded-lg markdown-edit-image';
      img.setAttribute('data-streamdown', 'image');
      wrapper.appendChild(img);

      const syncImage = (updatedNode: typeof node) => {
        const src = typeof updatedNode.attrs.src === 'string' ? updatedNode.attrs.src : '';
        const alt = typeof updatedNode.attrs.alt === 'string' ? updatedNode.attrs.alt : '';
        const title = typeof updatedNode.attrs.title === 'string' ? updatedNode.attrs.title : '';

        img.src = resolveImageSrc(src, baseUri);
        img.alt = alt;
        if (title) img.title = title;
        else img.removeAttribute('title');
        img.loading = 'lazy';
        img.draggable = true;
      };

      syncImage(node);

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false;
          syncImage(updatedNode);
          return true;
        },
      };
    };
  });
}

interface MilkdownEditorInnerProps {
  initialContent: string;
  baseUri: string;
}

function MilkdownEditorInner({ initialContent, baseUri }: MilkdownEditorInnerProps) {
  const isExternalUpdate = useRef(false);
  const lastSentContent = useRef(initialContent);

  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialContent);
        ctx.set(linkAttr.key, () => ({
          class: 'markdown-link',
          'data-streamdown': 'link',
          target: '_blank',
          rel: 'noopener noreferrer',
        }));
        ctx.set(headingAttr.key, (node) => {
          const level = Number(node.attrs.level) || 1;
          return {
            class: STREAMDOWN_HEADING_CLASSES[level] ?? STREAMDOWN_HEADING_CLASSES[1],
            'data-streamdown': `heading-${level}`,
          };
        });
        ctx.set(blockquoteAttr.key, () => ({
          class: 'my-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic',
          'data-streamdown': 'blockquote',
        }));
        ctx.set(orderedListAttr.key, () => ({
          class: STREAMDOWN_LIST_CLASSES.ordered,
          'data-streamdown': 'ordered-list',
        }));
        ctx.set(bulletListAttr.key, () => ({
          class: STREAMDOWN_LIST_CLASSES.unordered,
          'data-streamdown': 'unordered-list',
        }));
        ctx.set(listItemAttr.key, () => ({
          class: STREAMDOWN_LIST_CLASSES.item,
          'data-streamdown': 'list-item',
        }));
        ctx.set(hrAttr.key, () => ({
          class: 'my-6 border-border',
          'data-streamdown': 'horizontal-rule',
        }));
        ctx.set(strongAttr.key, () => ({
          class: 'font-semibold',
          'data-streamdown': 'strong',
        }));
        ctx.set(strikethroughAttr.key, () => ({
          'data-streamdown': 'strikethrough',
        }));
        ctx.set(inlineCodeAttr.key, () => ({
          class: 'rounded bg-muted px-1.5 py-0.5 font-mono text-sm',
          'data-streamdown': 'inline-code',
        }));
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (isExternalUpdate.current) return;
          if (markdown === prevMarkdown) return;
          if (markdown === lastSentContent.current) return;
          lastSentContent.current = markdown;
          getVsCodeApi()?.postMessage({ type: 'edit', content: markdown });
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(history)
      .use(clipboard)
      .use(indent)
      .use(trailing)
      .use(codeBlockNodeView)
      .use(tableNodeView)
      .use(tableHeaderRowNodeView)
      .use(tableRowNodeView)
      .use(tableHeaderNodeView)
      .use(tableCellNodeView)
      .use(createImageNodeView(baseUri)),
    [initialContent, baseUri]
  );

  const [loading, getInstance] = useInstance();

  useSaveContentProvider(() => {
    if (loading) return lastSentContent.current;
    const editor = getInstance();
    if (!editor) return lastSentContent.current;

    try {
      const markdown = editor.action(getMarkdown());
      lastSentContent.current = markdown;
      return markdown;
    } catch {
      return lastSentContent.current;
    }
  });

  useEffect(() => {
    return subscribe('update', (msg) => {
      if (msg.content === undefined) return;
      if (loading) return;
      const editor = getInstance();
      if (!editor) return;

      try {
        const currentMarkdown = editor.action(getMarkdown());
        if (currentMarkdown === msg.content) return;
      } catch {
        // editor may not be ready
      }

      isExternalUpdate.current = true;
      lastSentContent.current = msg.content;
      try {
        editor.action(replaceAll(msg.content));
      } catch {
        // ignore errors during replacement
      }
      isExternalUpdate.current = false;
    });
  }, [loading, getInstance]);

  return <Milkdown />;
}

interface MilkdownEditorProps {
  content: string;
  baseUri: string;
}

export function MilkdownEditor({ content, baseUri }: MilkdownEditorProps) {
  const initialContentRef = useRef(content);

  return (
    <MilkdownProvider>
      <MilkdownEditorInner initialContent={initialContentRef.current} baseUri={baseUri} />
    </MilkdownProvider>
  );
}
