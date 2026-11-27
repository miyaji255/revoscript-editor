import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { COMMANDS, type Locale } from '../core/spec.ts';
import { MACRO_TEMPLATES, type MacroTemplate } from '../core/templates.ts';
import type { UiCopy } from '../state/i18n.ts';
import type { MacroTab } from '../state/workspace.ts';
import { SearchIcon } from './Icons.tsx';
import type { WorkbenchTab } from './WorkbenchPanel.tsx';

export interface PaletteItem {
  readonly id: string;
  readonly group: string;
  readonly title: string;
  readonly subtitle: string;
  readonly run: () => void;
}

interface CommandPaletteProps {
  readonly open: boolean;
  readonly locale: Locale;
  readonly copy: UiCopy;
  readonly tabs: readonly MacroTab[];
  readonly onClose: () => void;
  readonly onInsertSnippet: (snippet: string) => void;
  readonly onOpenTemplate: (template: MacroTemplate) => void;
  readonly onSelectTab: (tabId: string) => void;
  readonly onFormat: () => void;
  readonly onCopy: () => void;
  readonly onCreateTab: () => void;
  readonly onToggleTheme: () => void;
  readonly onToggleLocale: () => void;
  readonly onSwitchWorkbenchTab: (tab: WorkbenchTab) => void;
}

export function CommandPalette({
  open,
  locale,
  copy,
  tabs,
  onClose,
  onInsertSnippet,
  onOpenTemplate,
  onSelectTab,
  onFormat,
  onCopy,
  onCreateTab,
  onToggleTheme,
  onToggleLocale,
  onSwitchWorkbenchTab,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const actions: PaletteItem[] = [
      {
        id: 'act-format',
        group: copy.paletteGroupAction,
        title: copy.formatShortcut,
        subtitle: 'format',
        run: onFormat,
      },
      {
        id: 'act-copy',
        group: copy.paletteGroupAction,
        title: copy.copy,
        subtitle: 'clipboard',
        run: onCopy,
      },
      {
        id: 'act-new-tab',
        group: copy.paletteGroupAction,
        title: copy.newTab,
        subtitle: 'tab',
        run: onCreateTab,
      },
      {
        id: 'act-blocks',
        group: copy.paletteGroupAction,
        title: copy.tabBlocks,
        subtitle: 'panel',
        run: () => onSwitchWorkbenchTab('blocks'),
      },
      {
        id: 'act-sim',
        group: copy.paletteGroupAction,
        title: copy.tabSimulator,
        subtitle: 'panel',
        run: () => onSwitchWorkbenchTab('simulator'),
      },
      {
        id: 'act-docs',
        group: copy.paletteGroupAction,
        title: copy.tabDocs,
        subtitle: 'panel',
        run: () => onSwitchWorkbenchTab('docs'),
      },
      {
        id: 'act-theme',
        group: copy.paletteGroupAction,
        title: `${copy.themeDark} / ${copy.themeLight}`,
        subtitle: 'theme',
        run: onToggleTheme,
      },
      {
        id: 'act-lang',
        group: copy.paletteGroupAction,
        title: '日本語 / English',
        subtitle: 'language',
        run: onToggleLocale,
      },
    ];

    const tabItems: PaletteItem[] = tabs.map((tab) => ({
      id: `tab-${tab.id}`,
      group: copy.paletteGroupTab,
      title: tab.name,
      subtitle: `${tab.content.split('\n').length} lines`,
      run: () => onSelectTab(tab.id),
    }));

    const templateItems: PaletteItem[] = MACRO_TEMPLATES.map((tpl) => ({
      id: `tpl-${tpl.id}`,
      group: copy.paletteGroupTemplate,
      title: tpl.title[locale],
      subtitle: tpl.stage[locale],
      run: () => onOpenTemplate(tpl),
    }));

    const commandItems: PaletteItem[] = COMMANDS.map((cmd) => ({
      id: `cmd-${cmd.name}`,
      group: copy.paletteGroupCommand,
      title: cmd.signature,
      subtitle: cmd.description[locale],
      run: () => onInsertSnippet(cmd.snippet),
    }));

    return [...actions, ...tabItems, ...templateItems, ...commandItems];
  }, [
    copy,
    locale,
    tabs,
    onFormat,
    onCopy,
    onCreateTab,
    onSwitchWorkbenchTab,
    onToggleTheme,
    onToggleLocale,
    onSelectTab,
    onOpenTemplate,
    onInsertSnippet,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items.slice(0, 24);
    }
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) {
    return null;
  }

  const executeItem = (item: PaletteItem | undefined) => {
    if (!item) {
      return;
    }
    onClose();
    item.run();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (filtered.length === 0 ? 0 : (idx + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) =>
        filtered.length === 0 ? 0 : (idx - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(filtered[selectedIndex]);
    }
  };

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={copy.palettePlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="kbd-hint">ESC</span>
        </div>

        <div className="palette-list">
          {filtered.length === 0 ? (
            <div className="palette-empty">{copy.paletteEmpty}</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`palette-item ${idx === selectedIndex ? 'is-selected' : ''}`}
                onClick={() => executeItem(item)}
              >
                <div className="palette-item-main">
                  <span className="palette-item-title">{item.title}</span>
                  <span className="palette-item-sub">{item.subtitle}</span>
                </div>
                <span className="palette-item-group">{item.group}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
