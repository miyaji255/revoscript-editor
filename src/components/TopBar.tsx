import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Locale } from '../core/spec.ts';
import type { ThemeMode } from '../editor/theme.ts';
import type { UiCopy } from '../state/i18n.ts';
import type { MacroTab } from '../state/workspace.ts';
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  FolderOpenIcon,
  FormatIcon,
  LogoIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SidebarIcon,
  SunIcon,
} from './Icons.tsx';

interface TopBarProps {
  readonly tabs: readonly MacroTab[];
  readonly activeTabId: string;
  readonly locale: Locale;
  readonly theme: ThemeMode;
  readonly sidebarOpen: boolean;
  readonly copiedRecent: boolean;
  readonly copy: UiCopy;
  readonly onSelectTab: (id: string) => void;
  readonly onCreateTab: () => void;
  readonly onDuplicateTab: (id: string) => void;
  readonly onCloseTab: (id: string) => void;
  readonly onRenameTab: (id: string, name: string) => void;
  readonly onOpenPalette: () => void;
  readonly onFormat: () => void;
  readonly onImportFile: (fileName: string, content: string) => void;
  readonly onExportFile: () => void;
  readonly onCopy: () => void;
  readonly onToggleTheme: () => void;
  readonly onToggleLocale: () => void;
  readonly onToggleSidebar: () => void;
}

export function TopBar({
  tabs,
  activeTabId,
  locale,
  theme,
  sidebarOpen,
  copiedRecent,
  copy,
  onSelectTab,
  onCreateTab,
  onDuplicateTab,
  onCloseTab,
  onRenameTab,
  onOpenPalette,
  onFormat,
  onImportFile,
  onExportFile,
  onCopy,
  onToggleTheme,
  onToggleLocale,
  onToggleSidebar,
}: TopBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startEditing = (tab: MacroTab) => {
    setEditingId(tab.id);
    setDraftName(tab.name);
  };

  const commitEdit = () => {
    if (editingId) {
      onRenameTab(editingId, draftName);
      setEditingId(null);
    }
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const content = await file.text();
      onImportFile(file.name, content);
    }
    e.target.value = '';
  };

  return (
    <header className="top-bar">
      <div className="top-left">
        <div className="brand-chip">
          <span className="brand-mark">
            <LogoIcon />
          </span>
          <span className="brand-name">{copy.appTitle}</span>
        </div>

        <div className="tab-scroll" role="tablist">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingId === tab.id;
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`tab-item ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
                onDoubleClick={() => startEditing(tab)}
                title={copy.renameHint}
              >
                {isEditing ? (
                  <input
                    className="tab-rename-input"
                    value={draftName}
                    autoFocus
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="tab-name">{tab.name}</span>
                )}

                <span className="tab-actions">
                  <button
                    type="button"
                    className="tab-icon-btn"
                    title={copy.duplicateTab}
                    aria-label={copy.duplicateTab}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateTab(tab.id);
                    }}
                  >
                    <CopyIcon width="11" height="11" />
                  </button>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      className="tab-icon-btn"
                      title={copy.closeTab}
                      aria-label={copy.closeTab}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                    >
                      <CloseIcon />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="tab-add-btn"
          onClick={onCreateTab}
          title={copy.newTab}
          aria-label={copy.newTab}
        >
          <PlusIcon />
        </button>
      </div>

      <div className="top-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={onOpenPalette}
          title="Ctrl+K"
        >
          <SearchIcon />
          <span>{copy.paletteButton}</span>
          <span className="kbd-hint">Ctrl+K</span>
        </button>

        <span className="top-divider" />

        <button
          type="button"
          className="btn-secondary"
          onClick={onFormat}
          title={copy.formatShortcut}
        >
          <FormatIcon />
          <span>{copy.format}</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpenIcon />
          <span>{copy.importFile}</span>
        </button>

        <button type="button" className="btn-secondary" onClick={onExportFile}>
          <DownloadIcon />
          <span>{copy.exportFile}</span>
        </button>

        <button type="button" className="btn-primary" onClick={onCopy}>
          {copiedRecent ? <CheckIcon /> : <CopyIcon />}
          <span>{copiedRecent ? copy.copied : copy.copy}</span>
        </button>

        <span className="top-divider" />

        <button
          type="button"
          className="btn-ghost"
          onClick={onToggleTheme}
          title={theme === 'dark' ? copy.themeLight : copy.themeDark}
          aria-label={theme === 'dark' ? copy.themeLight : copy.themeDark}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <button type="button" className="btn-ghost" onClick={onToggleLocale}>
          <span>{locale === 'ja' ? 'JA' : 'EN'}</span>
        </button>

        <button
          type="button"
          className={`btn-ghost ${sidebarOpen ? 'is-active' : ''}`}
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          title={copy.toggleSidebar}
        >
          <SidebarIcon />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.revo,.revoscript,text/plain"
          hidden
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
}
