import { useState } from 'react';
import type { Diagnostic, DiagnosticSeverity, QuickFix } from '../core/analyzer.ts';
import type { UiCopy } from '../state/i18n.ts';
import {
  CheckIcon,
  ChevronIcon,
  ErrorCircleIcon,
  InfoCircleIcon,
  WarningTriangleIcon,
} from './Icons.tsx';

type SeverityFilter = 'all' | DiagnosticSeverity;

interface DiagnosticsPanelProps {
  readonly diagnostics: readonly Diagnostic[];
  readonly open: boolean;
  readonly copy: UiCopy;
  readonly onToggleOpen: () => void;
  readonly onJumpTo: (pos: number) => void;
  readonly onApplyQuickFix: (fix: QuickFix) => void;
}

export function DiagnosticsPanel({
  diagnostics,
  open,
  copy,
  onToggleOpen,
  onJumpTo,
  onApplyQuickFix,
}: DiagnosticsPanelProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

  const visible =
    filter === 'all' ? diagnostics : diagnostics.filter((d) => d.severity === filter);

  const renderSeverityIcon = (severity: DiagnosticSeverity) => {
    switch (severity) {
      case 'error':
        return <ErrorCircleIcon />;
      case 'warning':
        return <WarningTriangleIcon />;
      case 'info':
        return <InfoCircleIcon />;
    }
  };

  return (
    <section className={`diagnostics-panel ${open ? 'is-open' : 'is-collapsed'}`}>
      <div className="diagnostics-header">
        <button
          type="button"
          className="diagnostics-toggle"
          onClick={onToggleOpen}
          aria-expanded={open}
        >
          <ChevronIcon open={open} />
          <strong>{copy.diagnosticsTitle}</strong>
          <span className="diag-count-pill">{diagnostics.length}</span>
        </button>

        <div className="diag-filters" role="group">
          <button
            type="button"
            className={`filter-pill ${filter === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {copy.filterAll} ({diagnostics.length})
          </button>
          <button
            type="button"
            className={`filter-pill is-error ${filter === 'error' ? 'is-active' : ''}`}
            onClick={() => setFilter('error')}
          >
            {copy.filterErrors} ({errorCount})
          </button>
          <button
            type="button"
            className={`filter-pill is-warning ${filter === 'warning' ? 'is-active' : ''}`}
            onClick={() => setFilter('warning')}
          >
            {copy.filterWarnings} ({warningCount})
          </button>
          <button
            type="button"
            className={`filter-pill is-info ${filter === 'info' ? 'is-active' : ''}`}
            onClick={() => setFilter('info')}
          >
            {copy.filterInfo} ({infoCount})
          </button>
        </div>
      </div>

      {open && (
        <div className="diagnostics-body">
          {visible.length === 0 ? (
            <div className="diagnostics-empty">
              <CheckIcon />
              <span>{copy.diagnosticsEmpty}</span>
            </div>
          ) : (
            visible.map((d) => (
              <div key={d.id} className={`diagnostic-row is-${d.severity}`}>
                <button
                  type="button"
                  className="diagnostic-jump"
                  onClick={() => onJumpTo(d.from)}
                >
                  <span className="diagnostic-icon">{renderSeverityIcon(d.severity)}</span>
                  <span className="diagnostic-msg">{d.message}</span>
                  <span className="diagnostic-loc">
                    Ln {d.line}, Col {d.col}
                  </span>
                </button>

                {d.quickFix && (
                  <button
                    type="button"
                    className="quickfix-btn"
                    onClick={() => onApplyQuickFix(d.quickFix!)}
                  >
                    {d.quickFix.label}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
