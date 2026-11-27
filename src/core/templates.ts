import type { LocalizedText } from './spec.ts';

export interface MacroTemplate {
  readonly id: string;
  readonly stage: LocalizedText;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly code: string;
}

export const MACRO_TEMPLATES: readonly MacroTemplate[] = [
  {
    id: 'ic-auto',
    stage: { ja: 'インフィニティ', en: 'Infinity' },
    title: { ja: 'インフィニティチャレンジ自動クリア', en: 'Infinity Challenges Auto-Clear' },
    description: {
      ja: 'IP が十分に溜まったら Break Infinity を解除し、IC 1〜9 を順番にクリアします。',
      en: 'Fixes Infinity once IP is high enough, clears IC 1-9 in sequence, and re-breaks Infinity.',
    },
    code: [
      'WaitUntil (IP >= 100000)',
      'BreakInfinity(false)',
      'EnterIC(1, true)',
      'EnterIC(2, true)',
      'EnterIC(3, true)',
      'EnterIC(4, true)',
      'EnterIC(5, true)',
      'EnterIC(6, true)',
      'EnterIC(7, true)',
      'EnterIC(8, true)',
      'EnterIC(9, true)',
      'BreakInfinity(true)',
      'WaitForSeconds(10.0)',
      '',
    ].join('\n'),
  },
  {
    id: 'prestige-promote',
    stage: { ja: '序盤・プレステージ', en: 'Early / Prestige' },
    title: { ja: 'プレステージ＆プロモーション周回', en: 'Prestige & Promote Loop' },
    description: {
      ja: 'スコア条件まで待機し、Prestige と色プロモーション 0〜3 を繰り返します。',
      en: 'Waits for a score threshold, runs Prestige and Promotes 0-3, then restarts.',
    },
    code: [
      'RepeatUntil (Score >= 1.00e80)',
      '\tPrestige()',
      '\tPromote(0)',
      '\tPromote(1)',
      '\tPromote(2)',
      '\tPromote(3)',
      '\tWaitForSeconds(2.0)',
      'Restart()',
      '',
    ].join('\n'),
  },
  {
    id: 'eternity-supernova',
    stage: { ja: 'エタニティ・超新星', en: 'Eternity / Supernova' },
    title: { ja: '超新星進行度別エタニティ分岐', en: 'Eternity & Supernova Branching' },
    description: {
      ja: 'EP と Supernova の進行度に応じて Eternate や EC4 を分岐実行します。',
      en: 'Branches on EP and Supernova count to automate Eternate and EC4 progression.',
    },
    code: [
      'if (EP == 0.00)',
      '\tEternate()',
      '\tRestart()',
      'else if (Supernova < 37.00)',
      '\tWaitForSeconds(5.0)',
      '\tEternate()',
      '\tRestart()',
      'else if (Supernova == 37.00)',
      '\tRepeatUntil (Supernova == 41.00)',
      '\t\tWaitForSeconds(5.0)',
      '\t\tEternate()',
      '\t\tWaitForSeconds(1.0)',
      '\t\tEnterEC(4, 0, true)',
      'else',
      '\tEternate()',
      '\tWaitForSeconds(2.0)',
      '',
    ].join('\n'),
  },
  {
    id: 'dilation-dtu',
    stage: { ja: 'ダイレーション', en: 'Dilation' },
    title: { ja: 'ダイレーション＆DTU構築', en: 'Dilation & DTU Setup' },
    description: {
      ja: 'EC 消化後に一時ダイレーションで DP を稼ぎ、ロードアウトと DTU を設定します。',
      en: 'Clears ECs, farms initial DP in Dilation, loads a preset, and upgrades DTU nodes.',
    },
    code: [
      'Eternate()',
      'EnterEC(8, 0, true)',
      'EnterEC(9, 0, true)',
      'Dilate(true)',
      'WaitForSeconds(3.0)',
      'Dilate(false)',
      'LoadDT(0)',
      'DTU(CENTER, 0, 4)',
      'DTU(MIDDLE, 0, 4)',
      'Dilate(true)',
      '',
    ].join('\n'),
  },
  {
    id: 'minerals-refine',
    stage: { ja: 'ミネラル・精錬', en: 'Minerals / Refine' },
    title: { ja: 'ミネラル研磨・精錬ループ', en: 'Minerals Polish & Refine Loop' },
    description: {
      ja: '最大ミネラルレベルと PP 増加量を確認しながら PolishPrestige と RefinePrestige を回します。',
      en: 'Checks MaxMineralLevelThisRun and PPAfterPrestige before running Polish and Refine.',
    },
    code: [
      'LoadPlanets(0)',
      'GenerateElement(Fire)',
      'WaitUntil (MaxMineralLevelThisRun >= 150 && PPAfterPrestige >= 1.00e100)',
      'PolishPrestige()',
      'WaitUntil (MaxMineralLevelThisRun >= 180 && PPAfterPrestige >= 1.00e200)',
      'PolishPrestige()',
      'WaitUntil (MaxMineralLevelThisRun >= 210)',
      'RefinePrestige()',
      'Restart()',
      '',
    ].join('\n'),
  },
];
