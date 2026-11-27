import { useMemo, useState } from 'react';
import type { ConditionExpr, OperandNode, ProgramNode, StatementNode } from '../core/ast.ts';
import type { ScriptMetrics } from '../core/metrics.ts';
import type { SimEnv, SimulatorState } from '../core/simulator.ts';
import {
  COMMAND_MAP,
  COMMANDS,
  VARIABLES,
  type CommandCategory,
  type Locale,
} from '../core/spec.ts';
import { MACRO_TEMPLATES, type MacroTemplate } from '../core/templates.ts';
import type { UiCopy } from '../state/i18n.ts';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BlocksIcon,
  BookIcon,
  CopyIcon,
  PlayIcon,
  PlusIcon,
  ResetIcon,
  SearchIcon,
  SkipForwardIcon,
  StepForwardIcon,
  TerminalIcon,
  TrashIcon,
} from './Icons.tsx';

export type WorkbenchTab = 'blocks' | 'simulator' | 'docs';
type DocsSubTab = 'reference' | 'templates';
type RefFilter = 'all' | CommandCategory | 'variables';

interface WorkbenchPanelProps {
  readonly activeTab: WorkbenchTab;
  readonly onChangeTab: (tab: WorkbenchTab) => void;
  readonly ast: ProgramNode;
  readonly metrics: ScriptMetrics;
  readonly locale: Locale;
  readonly copy: UiCopy;
  readonly simState: SimulatorState;
  readonly simVars: readonly string[];
  readonly simEnv: SimEnv;
  readonly onChangeSimVar: (name: string, value: string) => void;
  readonly onSimStep: () => void;
  readonly onSimRun: () => void;
  readonly onSimSkipWait: () => void;
  readonly onSimReset: () => void;
  readonly onJumpToLine: (lineNumber: number) => void;
  readonly onMoveBlock: (lineNumber: number, direction: 'up' | 'down') => void;
  readonly onDuplicateBlock: (lineNumber: number) => void;
  readonly onDeleteBlock: (lineNumber: number) => void;
  readonly onInsertSnippet: (snippet: string) => void;
  readonly onOpenTemplateInNewTab: (template: MacroTemplate) => void;
  readonly onReplaceWithTemplate: (template: MacroTemplate) => void;
}

function formatOperandText(op: OperandNode): string {
  switch (op.kind) {
    case 'VariableRef':
      return op.name;
    case 'NumberLiteral':
    case 'BooleanLiteral':
    case 'InvalidExpr':
      return op.raw;
  }
}

function formatConditionText(expr: ConditionExpr): string {
  switch (expr.kind) {
    case 'ComparisonExpr':
      return `${formatOperandText(expr.left)} ${expr.operator} ${formatOperandText(expr.right)}`;
    case 'LogicalExpr':
      return `${formatConditionText(expr.left)} ${expr.operator} ${formatConditionText(expr.right)}`;
    case 'GroupExpr':
      return `(${formatConditionText(expr.inner)})`;
    case 'InvalidExpr':
      return expr.raw || '?';
  }
}

function formatArgsText(stmt: StatementNode): string {
  if (stmt.name === 'else') {
    return '';
  }
  if (stmt.condition) {
    return `(${formatConditionText(stmt.condition)})`;
  }
  const inner = stmt.args
    .map((a) => {
      switch (a.kind) {
        case 'NumberLiteral':
        case 'BooleanLiteral':
          return a.raw;
        case 'IdentifierLiteral':
          return a.name;
        case 'InvalidExpr':
          return '?';
      }
    })
    .join(', ');
  return `(${inner})`;
}

function getCategoryVars(name: string): { color: string; bg: string } {
  const cat = COMMAND_MAP.get(name)?.category ?? 'control';
  return {
    color: `var(--cat-${cat})`,
    bg: `var(--cat-${cat}-bg)`,
  };
}

export function WorkbenchPanel({
  activeTab,
  onChangeTab,
  ast,
  metrics,
  locale,
  copy,
  simState,
  simVars,
  simEnv,
  onChangeSimVar,
  onSimStep,
  onSimRun,
  onSimSkipWait,
  onSimReset,
  onJumpToLine,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onInsertSnippet,
  onOpenTemplateInNewTab,
  onReplaceWithTemplate,
}: WorkbenchPanelProps) {
  const [docsSubTab, setDocsSubTab] = useState<DocsSubTab>('reference');
  const [searchQuery, setSearchQuery] = useState('');
  const [refFilter, setRefFilter] = useState<RefFilter>('all');

  const query = searchQuery.trim().toLowerCase();

  const filteredCommands = useMemo(() => {
    if (refFilter === 'variables') {
      return [];
    }
    return COMMANDS.filter((cmd) => {
      if (refFilter !== 'all' && cmd.category !== refFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        cmd.name.toLowerCase().includes(query) ||
        cmd.signature.toLowerCase().includes(query) ||
        cmd.description[locale].toLowerCase().includes(query)
      );
    });
  }, [refFilter, query, locale]);

  const filteredVariables = useMemo(() => {
    if (refFilter !== 'all' && refFilter !== 'variables') {
      return [];
    }
    return VARIABLES.filter((v) => {
      if (!query) {
        return true;
      }
      return (
        v.name.toLowerCase().includes(query) ||
        v.description[locale].toLowerCase().includes(query)
      );
    });
  }, [refFilter, query, locale]);

  const renderBlockNodes = (statements: readonly StatementNode[]) =>
    statements.map((stmt, idx) => {
      const isSimActive = simState.activeLine === stmt.nameSpan.line;
      const lineNum = stmt.nameSpan.line;
      const catVars = getCategoryVars(stmt.name);

      return (
        <div
          key={`${lineNum}:${stmt.nameSpan.col}:${idx}`}
          className={`block-node ${isSimActive ? 'is-sim-active' : ''}`}
          style={
            {
              '--cat-color': catVars.color,
              '--cat-bg': catVars.bg,
            } as React.CSSProperties
          }
        >
          <div className="block-header">
            <button
              type="button"
              className="block-jump-btn"
              onClick={() => onJumpToLine(lineNum)}
            >
              <span className="block-line">L{lineNum}</span>
              <span className="block-name">{stmt.name}</span>
              <span className="block-args">{formatArgsText(stmt)}</span>
            </button>

            <div className="block-actions">
              {idx > 0 && (
                <button
                  type="button"
                  className="block-action-btn"
                  title={copy.moveUp}
                  aria-label={copy.moveUp}
                  onClick={() => onMoveBlock(lineNum, 'up')}
                >
                  <ArrowUpIcon />
                </button>
              )}
              {idx < statements.length - 1 && (
                <button
                  type="button"
                  className="block-action-btn"
                  title={copy.moveDown}
                  aria-label={copy.moveDown}
                  onClick={() => onMoveBlock(lineNum, 'down')}
                >
                  <ArrowDownIcon />
                </button>
              )}
              <button
                type="button"
                className="block-action-btn"
                title={copy.duplicateBlock}
                aria-label={copy.duplicateBlock}
                onClick={() => onDuplicateBlock(lineNum)}
              >
                <CopyIcon width="11" height="11" />
              </button>
              <button
                type="button"
                className="block-action-btn is-danger"
                title={copy.deleteBlock}
                aria-label={copy.deleteBlock}
                onClick={() => onDeleteBlock(lineNum)}
              >
                <TrashIcon />
              </button>
            </div>
          </div>

          {stmt.kind === 'BlockStatement' && (
            <div className="block-children">
              {stmt.body.length > 0 ? (
                renderBlockNodes(stmt.body)
              ) : (
                <span className="block-empty-children">{copy.blockEmptyBody}</span>
              )}
            </div>
          )}
        </div>
      );
    });

  const categoryButtons: Array<{ id: RefFilter; label: string }> = [
    { id: 'all', label: copy.categoryAll },
    { id: 'control', label: copy.categories.control },
    { id: 'prestige', label: copy.categories.prestige },
    { id: 'infinity', label: copy.categories.infinity },
    { id: 'eternity', label: copy.categories.eternity },
    { id: 'dilation', label: copy.categories.dilation },
    { id: 'unity', label: copy.categories.unity },
    { id: 'variables', label: copy.categoryVariables },
  ];

  const isSimDone = simState.status === 'stopped' || simState.status === 'completed';

  return (
    <aside className="workbench-panel">
      <div className="workbench-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'blocks'}
          className={`workbench-tab ${activeTab === 'blocks' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('blocks')}
        >
          <BlocksIcon />
          <span>{copy.tabBlocks}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'simulator'}
          className={`workbench-tab ${activeTab === 'simulator' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('simulator')}
        >
          <TerminalIcon />
          <span>{copy.tabSimulator}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'docs'}
          className={`workbench-tab ${activeTab === 'docs' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('docs')}
        >
          <BookIcon />
          <span>{copy.tabDocs}</span>
        </button>
      </div>

      {activeTab === 'blocks' && (
        <div className="workbench-body">
          <div className="metrics-grid">
            <div className="metric-box">
              <small>{copy.metricsBlocks}</small>
              <strong>{metrics.blockSlotCount}</strong>
            </div>
            <div className="metric-box">
              <small>{copy.metricsDepth}</small>
              <strong>{metrics.maxNestingDepth}</strong>
            </div>
            <div className="metric-box">
              <small>{copy.metricsStatements}</small>
              <strong>{metrics.statementCount}</strong>
            </div>
          </div>

          <div className="blocks-tree">
            {ast.body.length === 0 ? (
              <p className="side-empty">{copy.blocksEmpty}</p>
            ) : (
              renderBlockNodes(ast.body)
            )}
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="workbench-body">
          <div className="sim-controls">
            <button
              type="button"
              className="btn-primary"
              disabled={isSimDone}
              onClick={onSimStep}
            >
              <StepForwardIcon />
              <span>{copy.simStep}</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={isSimDone}
              onClick={onSimRun}
            >
              <PlayIcon />
              <span>{copy.simRun}</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={simState.status !== 'waiting'}
              onClick={onSimSkipWait}
            >
              <SkipForwardIcon />
              <span>{copy.simSkipWait}</span>
            </button>

            <button type="button" className="btn-ghost" onClick={onSimReset}>
              <ResetIcon />
              <span>{copy.simReset}</span>
            </button>
          </div>

          <div className="sim-status-bar">
            <span className={`sim-badge is-${simState.status}`}>
              {copy.simStatuses[simState.status]}
            </span>
            <div className="sim-stats">
              <span>{simState.activeLine !== null ? `L${simState.activeLine}` : '-'}</span>
              <span>#{simState.stepCount}</span>
              <span>{Number(simState.simulatedSeconds.toFixed(2))}s</span>
            </div>
          </div>

          {simState.waitingReason && (
            <div className="sim-wait-banner">{simState.waitingReason}</div>
          )}

          <div className="sim-section-title">{copy.simVariables}</div>
          {simVars.length === 0 ? (
            <div className="side-empty">{copy.simNoVariables}</div>
          ) : (
            <div className="sim-vars-grid">
              {simVars.map((name) => (
                <div key={name} className="sim-var-field">
                  <label htmlFor={`sim-var-${name}`}>{name}</label>
                  <input
                    id={`sim-var-${name}`}
                    type="text"
                    value={simEnv[name] ?? '0'}
                    onChange={(e) => onChangeSimVar(name, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="sim-section-title">{copy.simTrace}</div>
          <div className="sim-log-list">
            {simState.logs.length === 0 ? (
              <div className="side-empty">{copy.simNoTrace}</div>
            ) : (
              simState.logs.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="sim-log-row"
                  onClick={() => onJumpToLine(entry.line)}
                >
                  <span className={`sim-log-kind is-${entry.kind}`}>{entry.kind}</span>
                  <span className="sim-log-text">{entry.text}</span>
                  <span className="sim-log-line">L{entry.line}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="workbench-body">
          <div className="docs-subtabs">
            <button
              type="button"
              className={`docs-subtab ${docsSubTab === 'reference' ? 'is-active' : ''}`}
              onClick={() => setDocsSubTab('reference')}
            >
              {copy.docsReference}
            </button>
            <button
              type="button"
              className={`docs-subtab ${docsSubTab === 'templates' ? 'is-active' : ''}`}
              onClick={() => setDocsSubTab('templates')}
            >
              {copy.docsTemplates}
            </button>
          </div>

          {docsSubTab === 'reference' ? (
            <>
              <div className="search-box">
                <SearchIcon />
                <input
                  type="search"
                  value={searchQuery}
                  placeholder={copy.searchPlaceholder}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="category-chips">
                {categoryButtons.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip ${refFilter === cat.id ? 'is-active' : ''}`}
                    onClick={() => setRefFilter(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="ref-list">
                {filteredCommands.map((cmd) => (
                  <button
                    key={cmd.name}
                    type="button"
                    className="ref-card"
                    onClick={() => onInsertSnippet(cmd.snippet)}
                  >
                    <div className="ref-card-head">
                      <span className="ref-kind is-cmd">fn</span>
                      <code className="ref-sig">{cmd.signature}</code>
                      <span className="ref-insert">
                        <PlusIcon width="12" height="12" />
                      </span>
                    </div>
                    <p className="ref-desc">{cmd.description[locale]}</p>
                  </button>
                ))}

                {filteredVariables.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    className="ref-card"
                    onClick={() => onInsertSnippet(v.name)}
                  >
                    <div className="ref-card-head">
                      <span className="ref-kind is-var">#</span>
                      <code className="ref-sig">{v.name}</code>
                      <span className="ref-insert">
                        <PlusIcon width="12" height="12" />
                      </span>
                    </div>
                    <p className="ref-desc">{v.description[locale]}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="templates-list">
              {MACRO_TEMPLATES.map((tpl) => (
                <div key={tpl.id} className="template-card">
                  <div className="template-head">
                    <span className="template-stage">{tpl.stage[locale]}</span>
                    <h3>{tpl.title[locale]}</h3>
                  </div>
                  <p className="template-desc">{tpl.description[locale]}</p>
                  <pre className="template-preview">{tpl.code.trim()}</pre>
                  <div className="template-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onOpenTemplateInNewTab(tpl)}
                    >
                      {copy.templateOpenNew}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onReplaceWithTemplate(tpl)}
                    >
                      {copy.templateReplace}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
