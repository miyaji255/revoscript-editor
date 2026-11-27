import type { Diagnostic as CmDiagnostic } from '@codemirror/lint';
import type { Diagnostic } from '../core/analyzer.ts';

export function toCodeMirrorDiagnostics(
  diagnostics: readonly Diagnostic[],
  docLength: number,
): CmDiagnostic[] {
  return diagnostics.map((d): CmDiagnostic => {
    const from = Math.max(0, Math.min(d.from, docLength));
    const to = Math.max(from, Math.min(d.to, docLength));

    const cmDiag: CmDiagnostic = {
      from,
      to,
      severity: d.severity,
      message: d.message,
    };

    if (d.quickFix) {
      const fix = d.quickFix;
      cmDiag.actions = [
        {
          name: fix.label,
          apply(targetView) {
            const len = targetView.state.doc.length;
            const fixFrom = Math.max(0, Math.min(fix.from, len));
            const fixTo = Math.max(fixFrom, Math.min(fix.to, len));
            targetView.dispatch({
              changes: { from: fixFrom, to: fixTo, insert: fix.insert },
            });
            targetView.focus();
          },
        },
      ];
    }

    return cmDiag;
  });
}
