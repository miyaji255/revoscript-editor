import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette } from './components/CommandPalette.tsx';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { Toast } from './components/Toast.tsx';
import { TopBar } from './components/TopBar.tsx';
import { WorkbenchPanel, type WorkbenchTab } from './components/WorkbenchPanel.tsx';
import { analyze, type QuickFix } from './core/analyzer.ts';
import {
  deleteBlockAtLine,
  duplicateBlockAtLine,
  moveBlockAtLine,
} from './core/blockOps.ts';
import { formatRevoScript } from './core/formatter.ts';
import {
  createSimulator,
  extractUsedVariables,
  runSimulatorSteps,
  stepSimulator,
  type SimEnv,
  type SimulatorState,
} from './core/simulator.ts';
import type { MacroTemplate } from './core/templates.ts';
import {
  CodeEditor,
  type CodeEditorHandle,
  type CursorPosition,
} from './editor/CodeEditor.tsx';
import { getUiCopy } from './state/i18n.ts';
import {
  closeTab,
  createInitialWorkspace,
  createTab,
  duplicateTab,
  getActiveTab,
  renameTab,
  saveWorkspace,
  selectTab,
  setLocale,
  setTheme,
  updateTabContent,
} from './state/workspace.ts';

export function App() {
  const [workspace, setWorkspace] = useState(() => createInitialWorkspace());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>('blocks');
  const [rightPaneWidth, setRightPaneWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, col: 1 });
  const [copiedRecent, setCopiedRecent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [simEnv, setSimEnv] = useState<SimEnv>({});

  const editorRef = useRef<CodeEditorHandle | null>(null);
  const splitRef = useRef<HTMLElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const activeTab = getActiveTab(workspace);
  const openTabIds = useMemo(() => workspace.tabs.map((t) => t.id), [workspace.tabs]);
  const copy = useMemo(() => getUiCopy(workspace.locale), [workspace.locale]);

  const analysis = useMemo(
    () => analyze(activeTab.content, workspace.locale),
    [activeTab.content, workspace.locale],
  );

  const simVars = useMemo(() => extractUsedVariables(analysis.ast), [analysis.ast]);

  const [simState, setSimState] = useState<SimulatorState>(() =>
    createSimulator(analysis.ast),
  );

  useEffect(() => {
    setSimState(createSimulator(analysis.ast));
  }, [analysis.ast, activeTab.id]);

  const errorCount = useMemo(
    () => analysis.diagnostics.filter((d) => d.severity === 'error').length,
    [analysis.diagnostics],
  );
  const warningCount = useMemo(
    () => analysis.diagnostics.filter((d) => d.severity === 'warning').length,
    [analysis.diagnostics],
  );

  useEffect(() => {
    if (errorCount > 0) {
      setDiagnosticsOpen(true);
    }
  }, [errorCount]);

  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  useEffect(() => {
    document.documentElement.lang = workspace.locale;
    document.documentElement.dataset.theme = workspace.theme;
  }, [workspace.locale, workspace.theme]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    if (!isResizing) {
      return;
    }
    const onMove = (e: MouseEvent) => {
      const container = splitRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(300, Math.min(640, rect.right - e.clientX));
      setRightPaneWidth(nextWidth);
    };
    const onUp = () => setIsResizing(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  const handleContentChange = useCallback((nextValue: string) => {
    setWorkspace((prev) => updateTabContent(prev, getActiveTab(prev).id, nextValue));
  }, []);

  const handleFormat = useCallback(() => {
    setWorkspace((prev) => {
      const current = getActiveTab(prev);
      const formatted = formatRevoScript(current.content);
      return updateTabContent(prev, current.id, formatted);
    });
    showToast(copy.toastFormatted);
    editorRef.current?.focus();
  }, [copy.toastFormatted, showToast]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeTab.content);
      setCopiedRecent(true);
      showToast(copy.toastCopied);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedRecent(false);
      }, 1800);
    } catch {
      showToast(copy.copyFailed);
    }
  }, [activeTab.content, copy.copyFailed, copy.toastCopied, showToast]);

  const handleImportFile = useCallback(
    (fileName: string, content: string) => {
      setWorkspace((prev) => createTab(prev, { name: fileName, content }));
      showToast(copy.toastImported);
    },
    [copy.toastImported, showToast],
  );

  const handleExportFile = useCallback(() => {
    const safeName = activeTab.name.replace(/\.[^.]+$/, '') || 'macro';
    const blob = new Blob([activeTab.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(copy.toastExported);
  }, [activeTab.content, activeTab.name, copy.toastExported, showToast]);

  const handleApplyQuickFix = useCallback((fix: QuickFix) => {
    editorRef.current?.applyEdit(fix.from, fix.to, fix.insert);
  }, []);

  const handleOpenTemplateInNewTab = useCallback((tpl: MacroTemplate) => {
    setWorkspace((prev) =>
      createTab(prev, {
        name: `${tpl.id}.revo`,
        content: tpl.code,
      }),
    );
  }, []);

  const handleReplaceWithTemplate = useCallback(
    (tpl: MacroTemplate) => {
      if (activeTab.content.trim().length === 0 || window.confirm(copy.confirmReplace)) {
        setWorkspace((prev) => updateTabContent(prev, activeTab.id, tpl.code));
      }
    },
    [activeTab.content, activeTab.id, copy.confirmReplace],
  );

  const handleMoveBlock = useCallback((lineNumber: number, direction: 'up' | 'down') => {
    setWorkspace((prev) => {
      const current = getActiveTab(prev);
      return updateTabContent(
        prev,
        current.id,
        moveBlockAtLine(current.content, lineNumber, direction),
      );
    });
  }, []);

  const handleDuplicateBlock = useCallback((lineNumber: number) => {
    setWorkspace((prev) => {
      const current = getActiveTab(prev);
      return updateTabContent(
        prev,
        current.id,
        duplicateBlockAtLine(current.content, lineNumber),
      );
    });
  }, []);

  const handleDeleteBlock = useCallback((lineNumber: number) => {
    setWorkspace((prev) => {
      const current = getActiveTab(prev);
      return updateTabContent(
        prev,
        current.id,
        deleteBlockAtLine(current.content, lineNumber),
      );
    });
  }, []);

  const activeSimHighlightLine =
    workbenchTab === 'simulator' && simState.stepCount > 0 ? simState.activeLine : null;

  return (
    <div className="app-shell">
      <TopBar
        tabs={workspace.tabs}
        activeTabId={activeTab.id}
        locale={workspace.locale}
        theme={workspace.theme}
        sidebarOpen={sidebarOpen}
        copiedRecent={copiedRecent}
        copy={copy}
        onSelectTab={(id) => setWorkspace((prev) => selectTab(prev, id))}
        onCreateTab={() => setWorkspace((prev) => createTab(prev))}
        onDuplicateTab={(id) => setWorkspace((prev) => duplicateTab(prev, id))}
        onCloseTab={(id) => setWorkspace((prev) => closeTab(prev, id))}
        onRenameTab={(id, name) => setWorkspace((prev) => renameTab(prev, id, name))}
        onOpenPalette={() => setPaletteOpen(true)}
        onFormat={handleFormat}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        onCopy={handleCopy}
        onToggleTheme={() =>
          setWorkspace((prev) => setTheme(prev, prev.theme === 'dark' ? 'light' : 'dark'))
        }
        onToggleLocale={() =>
          setWorkspace((prev) => setLocale(prev, prev.locale === 'ja' ? 'en' : 'ja'))
        }
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <main ref={splitRef} className="workbench-split">
        <section className="editor-pane">
          <div className="editor-area">
            <CodeEditor
              ref={editorRef}
              tabId={activeTab.id}
              openTabIds={openTabIds}
              value={activeTab.content}
              locale={workspace.locale}
              theme={workspace.theme}
              placeholderText={copy.placeholder}
              diagnostics={analysis.diagnostics}
              activeSimLine={activeSimHighlightLine}
              onChange={handleContentChange}
              onCursorChange={setCursor}
              onFormatRequest={handleFormat}
              onOpenPalette={() => setPaletteOpen(true)}
            />
          </div>

          <DiagnosticsPanel
            diagnostics={analysis.diagnostics}
            open={diagnosticsOpen}
            copy={copy}
            onToggleOpen={() => setDiagnosticsOpen((open) => !open)}
            onJumpTo={(pos) => editorRef.current?.jumpTo(pos)}
            onApplyQuickFix={handleApplyQuickFix}
          />
        </section>

        {sidebarOpen && (
          <>
            <div
              className={`split-resizer ${isResizing ? 'is-dragging' : ''}`}
              onMouseDown={() => setIsResizing(true)}
            />
            <div style={{ width: `${rightPaneWidth}px`, display: 'flex', minHeight: 0 }}>
              <WorkbenchPanel
                activeTab={workbenchTab}
                onChangeTab={setWorkbenchTab}
                ast={analysis.ast}
                metrics={analysis.metrics}
                locale={workspace.locale}
                copy={copy}
                simState={simState}
                simVars={simVars}
                simEnv={simEnv}
                onChangeSimVar={(name, val) =>
                  setSimEnv((prev) => ({ ...prev, [name]: val }))
                }
                onSimStep={() => setSimState((s) => stepSimulator(s, simEnv))}
                onSimRun={() => setSimState((s) => runSimulatorSteps(s, simEnv, 50))}
                onSimSkipWait={() =>
                  setSimState((s) => stepSimulator(s, simEnv, { skipWait: true }))
                }
                onSimReset={() => setSimState(createSimulator(analysis.ast))}
                onJumpToLine={(line) => editorRef.current?.jumpToLine(line)}
                onMoveBlock={handleMoveBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleDeleteBlock}
                onInsertSnippet={(snippet) => editorRef.current?.insertText(snippet)}
                onOpenTemplateInNewTab={handleOpenTemplateInNewTab}
                onReplaceWithTemplate={handleReplaceWithTemplate}
              />
            </div>
          </>
        )}
      </main>

      <StatusBar
        cursor={cursor}
        metrics={analysis.metrics}
        errorCount={errorCount}
        warningCount={warningCount}
        tabCount={workspace.tabs.length}
        simState={simState}
        copy={copy}
        onToggleDiagnostics={() => setDiagnosticsOpen((open) => !open)}
      />

      <CommandPalette
        open={paletteOpen}
        locale={workspace.locale}
        copy={copy}
        tabs={workspace.tabs}
        onClose={() => setPaletteOpen(false)}
        onInsertSnippet={(snippet) => editorRef.current?.insertText(snippet)}
        onOpenTemplate={handleOpenTemplateInNewTab}
        onSelectTab={(id) => setWorkspace((prev) => selectTab(prev, id))}
        onFormat={handleFormat}
        onCopy={handleCopy}
        onCreateTab={() => setWorkspace((prev) => createTab(prev))}
        onToggleTheme={() =>
          setWorkspace((prev) => setTheme(prev, prev.theme === 'dark' ? 'light' : 'dark'))
        }
        onToggleLocale={() =>
          setWorkspace((prev) => setLocale(prev, prev.locale === 'ja' ? 'en' : 'ja'))
        }
        onSwitchWorkbenchTab={(tab) => {
          setSidebarOpen(true);
          setWorkbenchTab(tab);
        }}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
