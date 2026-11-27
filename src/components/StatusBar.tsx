import type { ScriptMetrics } from '../core/metrics.ts';
import type { SimulatorState } from '../core/simulator.ts';
import type { CursorPosition } from '../editor/CodeEditor.tsx';
import type { UiCopy } from '../state/i18n.ts';
import {
  ErrorCircleIcon,
  ExternalLinkIcon,
  WarningTriangleIcon,
} from './Icons.tsx';

interface StatusBarProps {
  readonly cursor: CursorPosition;
  readonly metrics: ScriptMetrics;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly tabCount: number;
  readonly simState: SimulatorState;
  readonly copy: UiCopy;
  readonly onToggleDiagnostics: () => void;
}

export function StatusBar({
  cursor,
  metrics,
  errorCount,
  warningCount,
  tabCount,
  simState,
  copy,
  onToggleDiagnostics,
}: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-left">
        <button
          type="button"
          className="status-diag-btn"
          onClick={onToggleDiagnostics}
          title={copy.toggleDiagnostics}
        >
          <span className={`status-count ${errorCount > 0 ? 'is-error' : ''}`}>
            <ErrorCircleIcon />
            <span>{errorCount}</span>
          </span>
          <span className={`status-count ${warningCount > 0 ? 'is-warning' : ''}`}>
            <WarningTriangleIcon />
            <span>{warningCount}</span>
          </span>
        </button>

        {simState.stepCount > 0 && (
          <span className="status-sim-pill">
            SIM: {copy.simStatuses[simState.status]}
            {simState.activeLine !== null ? ` · L${simState.activeLine}` : ''}
          </span>
        )}

        <span className="status-privacy">{copy.privacyNote}</span>
      </div>

      <div className="status-right">
        <span className="status-cursor">
          Ln {cursor.line}, Col {cursor.col}
        </span>
        <span>
          {copy.statusSlots}: {metrics.blockSlotCount}
        </span>
        <span>
          {copy.statusLines}: {metrics.lineCount}
        </span>
        <span>
          {copy.statusTabs}: {tabCount}
        </span>
        <span className="status-links">
          <a href="https://wikiwiki.jp/revoidle/Macro" target="_blank" rel="noreferrer">
            JP Wiki <ExternalLinkIcon />
          </a>
          <a href="https://revolutionidle.wiki.gg/wiki/Macro_Builder" target="_blank" rel="noreferrer">
            EN Wiki <ExternalLinkIcon />
          </a>
          <a href="https://github.com/miyaji255/revoscript-editor" target="_blank" rel="noreferrer">
            GitHub <ExternalLinkIcon />
          </a>
        </span>
      </div>
    </footer>
  );
}
