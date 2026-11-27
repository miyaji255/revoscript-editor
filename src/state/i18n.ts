import type { CommandCategory, Locale } from '../core/spec.ts';

export interface UiCopy {
  readonly appTitle: string;
  readonly themeDark: string;
  readonly themeLight: string;
  readonly toggleSidebar: string;
  readonly newTab: string;
  readonly duplicateTab: string;
  readonly closeTab: string;
  readonly renameHint: string;
  readonly format: string;
  readonly formatShortcut: string;
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly importFile: string;
  readonly exportFile: string;
  readonly paletteButton: string;
  readonly palettePlaceholder: string;
  readonly paletteEmpty: string;
  readonly paletteGroupAction: string;
  readonly paletteGroupCommand: string;
  readonly paletteGroupTemplate: string;
  readonly paletteGroupTab: string;
  readonly placeholder: string;
  readonly diagnosticsTitle: string;
  readonly diagnosticsEmpty: string;
  readonly filterAll: string;
  readonly filterErrors: string;
  readonly filterWarnings: string;
  readonly filterInfo: string;
  readonly toggleDiagnostics: string;
  readonly tabBlocks: string;
  readonly tabSimulator: string;
  readonly tabDocs: string;
  readonly docsReference: string;
  readonly docsTemplates: string;
  readonly blocksEmpty: string;
  readonly blockEmptyBody: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly duplicateBlock: string;
  readonly deleteBlock: string;
  readonly metricsBlocks: string;
  readonly metricsDepth: string;
  readonly metricsStatements: string;
  readonly simStep: string;
  readonly simRun: string;
  readonly simSkipWait: string;
  readonly simReset: string;
  readonly simVariables: string;
  readonly simNoVariables: string;
  readonly simTrace: string;
  readonly simNoTrace: string;
  readonly simStatuses: {
    readonly ready: string;
    readonly running: string;
    readonly waiting: string;
    readonly stopped: string;
    readonly completed: string;
  };
  readonly searchPlaceholder: string;
  readonly categoryAll: string;
  readonly categoryVariables: string;
  readonly categories: Readonly<Record<CommandCategory, string>>;
  readonly templateOpenNew: string;
  readonly templateReplace: string;
  readonly confirmReplace: string;
  readonly statusTabs: string;
  readonly statusSlots: string;
  readonly statusLines: string;
  readonly toastFormatted: string;
  readonly toastCopied: string;
  readonly toastImported: string;
  readonly toastExported: string;
  readonly privacyNote: string;
}

const JA_COPY: UiCopy = {
  appTitle: 'RevoScript',
  themeDark: 'ダーク',
  themeLight: 'ライト',
  toggleSidebar: '右パネル開閉',
  newTab: '新しいタブ',
  duplicateTab: 'タブを複製',
  closeTab: 'タブを閉じる',
  renameHint: 'ダブルクリックで名前変更',
  format: '整形',
  formatShortcut: '整形 (Shift+Alt+F)',
  copy: 'コピー',
  copied: 'コピー済み',
  copyFailed: 'クリップボードにコピーできませんでした。',
  importFile: '開く',
  exportFile: '保存',
  paletteButton: 'コマンド',
  palettePlaceholder: '操作・命令・テンプレート・タブを検索…',
  paletteEmpty: '一致する項目がありません',
  paletteGroupAction: '操作',
  paletteGroupCommand: '命令を挿入',
  paletteGroupTemplate: 'テンプレート',
  paletteGroupTab: 'タブ切替',
  placeholder: 'RevoScript を入力してください（Ctrl+Space で補完 / Ctrl+K でコマンド）…',
  diagnosticsTitle: '診断',
  diagnosticsEmpty: '問題は見つかりませんでした',
  filterAll: 'すべて',
  filterErrors: 'エラー',
  filterWarnings: '警告',
  filterInfo: '情報',
  toggleDiagnostics: '診断パネルを開閉',
  tabBlocks: 'ブロック',
  tabSimulator: 'シミュレータ',
  tabDocs: 'ドキュメント',
  docsReference: 'リファレンス',
  docsTemplates: 'テンプレート',
  blocksEmpty: '左のエディタに命令を入力するとブロック構造が表示されます。',
  blockEmptyBody: '空のブロック',
  moveUp: '上へ移動',
  moveDown: '下へ移動',
  duplicateBlock: '複製',
  deleteBlock: '削除',
  metricsBlocks: 'ブロック枠',
  metricsDepth: '最大ネスト',
  metricsStatements: '命令数',
  simStep: 'ステップ',
  simRun: '50ステップ実行',
  simSkipWait: '待機をスキップ',
  simReset: 'リセット',
  simVariables: 'シミュレーション変数（1.00e80 / 100e9000 対応）',
  simNoVariables: 'このマクロには条件式で使用する変数がありません。',
  simTrace: '実行トレース',
  simNoTrace: '「ステップ」または「50ステップ実行」を押して動作を検証します。',
  simStatuses: {
    ready: '待機前',
    running: '実行中',
    waiting: '条件/時間待ち',
    stopped: '停止',
    completed: '終端到達',
  },
  searchPlaceholder: '命令・変数を検索…',
  categoryAll: 'すべて',
  categoryVariables: '変数',
  categories: {
    control: '制御',
    prestige: 'プレステージ',
    infinity: 'インフィニティ',
    eternity: 'エタニティ',
    dilation: 'ダイレーション',
    unity: 'ユニティ',
  },
  templateOpenNew: '新しいタブで開く',
  templateReplace: '現在のタブに適用',
  confirmReplace: '現在のタブの内容をこのテンプレートで置き換えますか？',
  statusTabs: 'タブ',
  statusSlots: 'ブロック枠',
  statusLines: '行',
  toastFormatted: 'コードを整形しました',
  toastCopied: 'クリップボードにコピーしました',
  toastImported: 'ファイルを読み込みました',
  toastExported: 'ファイルを書き出しました',
  privacyNote: 'ローカル自動保存',
};

const EN_COPY: UiCopy = {
  appTitle: 'RevoScript',
  themeDark: 'Dark',
  themeLight: 'Light',
  toggleSidebar: 'Toggle side panel',
  newTab: 'New tab',
  duplicateTab: 'Duplicate tab',
  closeTab: 'Close tab',
  renameHint: 'Double-click to rename',
  format: 'Format',
  formatShortcut: 'Format (Shift+Alt+F)',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Could not copy to clipboard.',
  importFile: 'Open',
  exportFile: 'Save',
  paletteButton: 'Commands',
  palettePlaceholder: 'Search actions, commands, templates, or tabs…',
  paletteEmpty: 'No matching items',
  paletteGroupAction: 'Action',
  paletteGroupCommand: 'Insert',
  paletteGroupTemplate: 'Template',
  paletteGroupTab: 'Tab',
  placeholder: 'Write RevoScript here (Ctrl+Space to complete / Ctrl+K for commands)…',
  diagnosticsTitle: 'Diagnostics',
  diagnosticsEmpty: 'No diagnostics found',
  filterAll: 'All',
  filterErrors: 'Errors',
  filterWarnings: 'Warnings',
  filterInfo: 'Info',
  toggleDiagnostics: 'Toggle diagnostics panel',
  tabBlocks: 'Blocks',
  tabSimulator: 'Simulator',
  tabDocs: 'Docs',
  docsReference: 'Reference',
  docsTemplates: 'Templates',
  blocksEmpty: 'Write commands in the editor to view and reorder blocks here.',
  blockEmptyBody: 'Empty block',
  moveUp: 'Move up',
  moveDown: 'Move down',
  duplicateBlock: 'Duplicate',
  deleteBlock: 'Delete',
  metricsBlocks: 'Block slots',
  metricsDepth: 'Max depth',
  metricsStatements: 'Statements',
  simStep: 'Step',
  simRun: 'Run 50',
  simSkipWait: 'Skip Wait',
  simReset: 'Reset',
  simVariables: 'Simulation Variables (supports 1.00e80 / 100e9000)',
  simNoVariables: 'This macro has no variables referenced in conditions.',
  simTrace: 'Execution Trace',
  simNoTrace: 'Click Step or Run 50 to dry-run this macro.',
  simStatuses: {
    ready: 'Ready',
    running: 'Running',
    waiting: 'Waiting',
    stopped: 'Stopped',
    completed: 'Completed',
  },
  searchPlaceholder: 'Search commands & variables…',
  categoryAll: 'All',
  categoryVariables: 'Variables',
  categories: {
    control: 'Control',
    prestige: 'Prestige',
    infinity: 'Infinity',
    eternity: 'Eternity',
    dilation: 'Dilation',
    unity: 'Unity',
  },
  templateOpenNew: 'Open in New Tab',
  templateReplace: 'Replace Current',
  confirmReplace: 'Replace the current tab content with this template?',
  statusTabs: 'Tabs',
  statusSlots: 'Slots',
  statusLines: 'Lines',
  toastFormatted: 'Script formatted',
  toastCopied: 'Copied to clipboard',
  toastImported: 'File imported',
  toastExported: 'File exported',
  privacyNote: 'Auto-saved locally',
};

export function getUiCopy(locale: Locale): UiCopy {
  return locale === 'ja' ? JA_COPY : EN_COPY;
}
