export type Locale = 'ja' | 'en';

export interface LocalizedText {
  readonly ja: string;
  readonly en: string;
}

export type CommandCategory =
  | 'control'
  | 'prestige'
  | 'infinity'
  | 'eternity'
  | 'dilation'
  | 'unity';

export type VariableCategory =
  | 'general'
  | 'infinity'
  | 'eternity'
  | 'dilation'
  | 'unity'
  | 'minerals';

export type ParamType =
  | 'condition'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'dtBranch'
  | 'element'
  | 'tcType';

export interface ParamSpec {
  readonly name: string;
  readonly type: ParamType;
  readonly min?: number;
  readonly max?: number;
  readonly description: LocalizedText;
}

export interface CommandSpec {
  readonly name: string;
  readonly category: CommandCategory;
  readonly signature: string;
  readonly snippet: string;
  readonly cmSnippet?: string;
  readonly isBlock: boolean;
  readonly takesParens: boolean;
  readonly consumesBlockSlot: boolean;
  readonly requiresPrecedingIf: boolean;
  readonly params: readonly ParamSpec[];
  readonly description: LocalizedText;
  readonly notes?: LocalizedText;
}

export interface VariableSpec {
  readonly name: string;
  readonly category: VariableCategory;
  readonly description: LocalizedText;
}

export const ENUM_VALUES = {
  dtBranch: ['CENTER', 'TOP', 'MIDDLE', 'BOTTOM'] as const,
  element: ['Fire', 'Earth', 'Wind', 'Water'] as const,
} as const;

export const COMPARISON_OPERATORS = ['>=', '<=', '==', '!=', '>', '<'] as const;
export const LOGICAL_OPERATORS = ['&&', '||', '^'] as const;

export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number];
export type LogicalOperator = (typeof LOGICAL_OPERATORS)[number];

export const COMMANDS: readonly CommandSpec[] = [
  {
    name: 'if',
    category: 'control',
    signature: 'if (condition)',
    snippet: 'if (Score >= 1.00e10)\n\t',
    cmSnippet: 'if (${Score >= 1.00e10})\n\t${}',
    isBlock: true,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'condition',
        type: 'condition',
        description: {
          ja: '実行を許可する条件式',
          en: 'Boolean condition controlling execution',
        },
      },
    ],
    description: {
      ja: '条件を満たす場合に、インデントされた子ブロックを実行します。',
      en: 'Executes its indented child block when the condition evaluates to true.',
    },
  },
  {
    name: 'else if',
    category: 'control',
    signature: 'else if (condition)',
    snippet: 'else if (Score >= 1.00e10)\n\t',
    cmSnippet: 'else if (${Score >= 1.00e10})\n\t${}',
    isBlock: true,
    takesParens: true,
    consumesBlockSlot: false,
    requiresPrecedingIf: true,
    params: [
      {
        name: 'condition',
        type: 'condition',
        description: {
          ja: '前の分岐が偽の場合に評価する条件式',
          en: 'Condition checked when preceding branches are false',
        },
      },
    ],
    description: {
      ja: '直前の if / else if が偽で、この条件が真のときに子ブロックを実行します。',
      en: 'Executes when preceding if / else if branches are false and this condition is true.',
    },
    notes: {
      ja: '直前の if / else if と同じインデント階層に配置する必要があります。',
      en: 'Must immediately follow an if or else if block at the same indentation level.',
    },
  },
  {
    name: 'else',
    category: 'control',
    signature: 'else',
    snippet: 'else\n\t',
    cmSnippet: 'else\n\t${}',
    isBlock: true,
    takesParens: false,
    consumesBlockSlot: false,
    requiresPrecedingIf: true,
    params: [],
    description: {
      ja: '直前の if / else if のいずれにも当てはまらない場合に子ブロックを実行します。',
      en: 'Executes its child block when none of the preceding if / else if conditions matched.',
    },
    notes: {
      ja: '括弧は不要です。直前の if / else if と同じ階層に配置します。',
      en: 'Takes no parentheses and must follow an if or else if at the same level.',
    },
  },
  {
    name: 'Repeat',
    category: 'control',
    signature: 'Repeat (count, infinite)',
    snippet: 'Repeat (9, false)\n\t',
    cmSnippet: 'Repeat (${9}, ${false})\n\t${}',
    isBlock: true,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'count',
        type: 'integer',
        min: 0,
        description: {
          ja: '繰り返し回数（infinite が false のときに使用）',
          en: 'Number of iterations when infinite is false',
        },
      },
      {
        name: 'infinite',
        type: 'boolean',
        description: {
          ja: 'true で無限ループ、false で指定回数ループ',
          en: 'true to repeat forever, false for count iterations',
        },
      },
    ],
    description: {
      ja: '子ブロックを指定回数または無限に繰り返します。',
      en: 'Repeats the child block a set number of times or indefinitely.',
    },
  },
  {
    name: 'RepeatUntil',
    category: 'control',
    signature: 'RepeatUntil (condition)',
    snippet: 'RepeatUntil (IP >= 1000)\n\t',
    cmSnippet: 'RepeatUntil (${IP >= 1000})\n\t${}',
    isBlock: true,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'condition',
        type: 'condition',
        description: {
          ja: 'ループを終了する条件式',
          en: 'Loop termination condition',
        },
      },
    ],
    description: {
      ja: '条件を満たすまで子ブロックを繰り返します。最初から条件を満たしている場合は実行しません。',
      en: 'Repeats the child block until the condition becomes true. Skips execution if already true.',
    },
  },
  {
    name: 'WaitUntil',
    category: 'control',
    signature: 'WaitUntil (condition)',
    snippet: 'WaitUntil (IP >= 1000)',
    cmSnippet: 'WaitUntil (${IP >= 1000})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'condition',
        type: 'condition',
        description: {
          ja: '待機を解除する条件式',
          en: 'Condition that resumes macro execution',
        },
      },
    ],
    description: {
      ja: '指定した条件が成立するまでマクロの進行を一時停止します。',
      en: 'Pauses macro execution until the specified condition becomes true.',
    },
  },
  {
    name: 'WaitForSeconds',
    category: 'control',
    signature: 'WaitForSeconds(seconds)',
    snippet: 'WaitForSeconds(1.0)',
    cmSnippet: 'WaitForSeconds(${1.0})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'seconds',
        type: 'number',
        min: 0,
        description: {
          ja: '待機する秒数（小数可）',
          en: 'Seconds to wait (decimals allowed)',
        },
      },
    ],
    description: {
      ja: '指定した秒数だけ待機します。',
      en: 'Waits for the specified number of seconds.',
    },
  },
  {
    name: 'Restart',
    category: 'control',
    signature: 'Restart()',
    snippet: 'Restart()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: '現在のマクロの先頭行から実行をやり直します。',
      en: 'Restarts the current macro from the beginning.',
    },
  },
  {
    name: 'Stop',
    category: 'control',
    signature: 'Stop()',
    snippet: 'Stop()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: 'マクロの実行を停止します。',
      en: 'Stops macro execution.',
    },
  },
  {
    name: 'GoToMacro',
    category: 'control',
    signature: 'GoToMacro(slot)',
    snippet: 'GoToMacro(1)',
    cmSnippet: 'GoToMacro(${1})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'slot',
        type: 'integer',
        min: 0,
        description: {
          ja: '遷移先のマクロスロット番号',
          en: 'Target macro slot index',
        },
      },
    ],
    description: {
      ja: '別のマクロスロットへ実行を切り替えます。',
      en: 'Transfers execution to another macro slot.',
    },
  },
  {
    name: 'Prestige',
    category: 'prestige',
    signature: 'Prestige()',
    snippet: 'Prestige()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: 'プレステージを実行します。',
      en: 'Performs a Prestige reset.',
    },
  },
  {
    name: 'Promote',
    category: 'prestige',
    signature: 'Promote(index)',
    snippet: 'Promote(0)',
    cmSnippet: 'Promote(${0})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'index',
        type: 'integer',
        min: 0,
        max: 3,
        description: {
          ja: 'プロモーション対象の色インデックス (0〜3)',
          en: 'Color promotion index (0 to 3)',
        },
      },
    ],
    description: {
      ja: '指定した色のプロモーションを実行します。',
      en: 'Promotes the selected color index.',
    },
  },
  {
    name: 'DailyReward',
    category: 'prestige',
    signature: 'DailyReward()',
    snippet: 'DailyReward()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: 'デイリー報酬を受け取ります。',
      en: 'Claims the daily reward if available.',
    },
  },
  {
    name: 'Infinite',
    category: 'infinity',
    signature: 'Infinite()',
    snippet: 'Infinite()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: 'インフィニティを実行します。',
      en: 'Performs an Infinity reset.',
    },
  },
  {
    name: 'BreakInfinity',
    category: 'infinity',
    signature: 'BreakInfinity(enabled)',
    snippet: 'BreakInfinity(true)',
    cmSnippet: 'BreakInfinity(${true})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'enabled',
        type: 'boolean',
        description: {
          ja: 'true でインフィニティを破壊、false で修復',
          en: 'true to break Infinity, false to fix Infinity',
        },
      },
    ],
    description: {
      ja: 'Break Infinity（インフィニティの破壊・修復）を切り替えます。',
      en: 'Breaks or fixes Infinity.',
    },
  },
  {
    name: 'EnterIC',
    category: 'infinity',
    signature: 'EnterIC(index, wait)',
    snippet: 'EnterIC(1, true)',
    cmSnippet: 'EnterIC(${1}, ${true})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'index',
        type: 'integer',
        min: 0,
        max: 9,
        description: {
          ja: 'インフィニティチャレンジ番号 (0〜9)',
          en: 'Infinity Challenge index (0 to 9)',
        },
      },
      {
        name: 'wait',
        type: 'boolean',
        description: {
          ja: 'true でチャレンジ完了まで待機',
          en: 'true to wait until the challenge completes',
        },
      },
    ],
    description: {
      ja: 'インフィニティチャレンジに入ります。',
      en: 'Enters an Infinity Challenge.',
    },
  },
  {
    name: 'Eternate',
    category: 'eternity',
    signature: 'Eternate()',
    snippet: 'Eternate()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: 'エタニティを実行します。',
      en: 'Performs an Eternity reset.',
    },
  },
  {
    name: 'EnterEC',
    category: 'eternity',
    signature: 'EnterEC(index, level, wait)',
    snippet: 'EnterEC(1, 0, true)',
    cmSnippet: 'EnterEC(${1}, ${0}, ${true})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'index',
        type: 'integer',
        min: 0,
        max: 10,
        description: {
          ja: 'エタニティチャレンジ番号 (0〜10)',
          en: 'Eternity Challenge index (0 to 10)',
        },
      },
      {
        name: 'level',
        type: 'integer',
        min: 0,
        max: 5,
        description: {
          ja: 'チャレンジの難易度 / ティア (0〜5)',
          en: 'Challenge difficulty / tier (0 to 5)',
        },
      },
      {
        name: 'wait',
        type: 'boolean',
        description: {
          ja: 'true でチャレンジ完了まで待機',
          en: 'true to wait until the challenge completes',
        },
      },
    ],
    description: {
      ja: 'エタニティチャレンジに入ります。',
      en: 'Enters an Eternity Challenge.',
    },
  },
  {
    name: 'ExitEC',
    category: 'eternity',
    signature: 'ExitEC()',
    snippet: 'ExitEC()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: '現在挑戦中のエタニティチャレンジから退出します。',
      en: 'Exits the active Eternity Challenge.',
    },
  },
  {
    name: 'Dilate',
    category: 'dilation',
    signature: 'Dilate(enabled)',
    snippet: 'Dilate(true)',
    cmSnippet: 'Dilate(${true})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'enabled',
        type: 'boolean',
        description: {
          ja: 'true でダイレーション突入、false で退出',
          en: 'true to enter Dilation, false to exit',
        },
      },
    ],
    description: {
      ja: 'ダイレーションへの突入・退出を切り替えます。',
      en: 'Enters or exits Time Dilation.',
    },
  },
  {
    name: 'DTU',
    category: 'dilation',
    signature: 'DTU(branch, row, level)',
    snippet: 'DTU(CENTER, 0, 4)',
    cmSnippet: 'DTU(${CENTER}, ${0}, ${4})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'branch',
        type: 'dtBranch',
        description: {
          ja: 'ツリーのブランチ (CENTER / TOP / MIDDLE / BOTTOM)',
          en: 'Tree branch (CENTER / TOP / MIDDLE / BOTTOM)',
        },
      },
      {
        name: 'row',
        type: 'integer',
        min: 0,
        description: {
          ja: 'ノード位置インデックス (0〜)',
          en: 'Node row index (0+)',
        },
      },
      {
        name: 'level',
        type: 'integer',
        min: 0,
        description: {
          ja: '目標レベル (0〜)',
          en: 'Target upgrade level (0+)',
        },
      },
    ],
    description: {
      ja: 'ダイレーションツリーの指定ノードをアップグレードします。',
      en: 'Upgrades a specific node in the Dilation Tree.',
    },
  },
  {
    name: 'LoadDT',
    category: 'dilation',
    signature: 'LoadDT(slot)',
    snippet: 'LoadDT(0)',
    cmSnippet: 'LoadDT(${0})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'slot',
        type: 'integer',
        min: 0,
        description: {
          ja: 'ロードアウトスロット番号 (0〜)',
          en: 'Saved Dilation Tree slot index (0+)',
        },
      },
    ],
    description: {
      ja: '保存済みのダイレーションツリー構成を読み込みます。',
      en: 'Loads a saved Dilation Tree preset.',
    },
  },
  {
    name: 'LoadPlanets',
    category: 'unity',
    signature: 'LoadPlanets(slot)',
    snippet: 'LoadPlanets(0)',
    cmSnippet: 'LoadPlanets(${0})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'slot',
        type: 'integer',
        min: 0,
        description: {
          ja: '惑星ロードアウトのスロット番号 (0〜)',
          en: 'Planet loadout slot index (0+)',
        },
      },
    ],
    description: {
      ja: '保存済みの惑星 / Zodiac ロードアウトを読み込みます。',
      en: 'Loads a saved Planet / Zodiac loadout.',
    },
  },
  {
    name: 'PolishPrestige',
    category: 'unity',
    signature: 'PolishPrestige()',
    snippet: 'PolishPrestige()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: '研磨プレステージ（Polish Prestige）を実行します。',
      en: 'Performs a Polish Prestige reset.',
    },
  },
  {
    name: 'RefinePrestige',
    category: 'unity',
    signature: 'RefinePrestige()',
    snippet: 'RefinePrestige()',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [],
    description: {
      ja: '精錬プレステージ（Refine Prestige）を実行します。',
      en: 'Performs a Refine Prestige reset.',
    },
  },
  {
    name: 'GenerateElement',
    category: 'unity',
    signature: 'GenerateElement(element)',
    snippet: 'GenerateElement(Fire)',
    cmSnippet: 'GenerateElement(${Fire})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'element',
        type: 'element',
        description: {
          ja: '生成する元素 (Fire / Earth / Wind / Water)',
          en: 'Element to generate (Fire / Earth / Wind / Water)',
        },
      },
    ],
    description: {
      ja: '生成する元素タイプを選択します。',
      en: 'Selects which element type to generate.',
    },
  },
  {
    name: 'EnterTC',
    category: 'unity',
    signature: 'EnterTC(type, level, wait)',
    snippet: 'EnterTC(0, 1, true)',
    cmSnippet: 'EnterTC(${0}, ${1}, ${true})',
    isBlock: false,
    takesParens: true,
    consumesBlockSlot: true,
    requiresPrecedingIf: false,
    params: [
      {
        name: 'type',
        type: 'tcType',
        description: {
          ja: 'タロットチャレンジの種類（数値または識別子）',
          en: 'Tarot Challenge type (index or identifier)',
        },
      },
      {
        name: 'level',
        type: 'integer',
        min: 0,
        description: {
          ja: 'チャレンジレベル (0〜)',
          en: 'Challenge level (0+)',
        },
      },
      {
        name: 'wait',
        type: 'boolean',
        description: {
          ja: 'true で完了まで待機',
          en: 'true to wait until completion',
        },
      },
    ],
    description: {
      ja: 'タロットチャレンジ（Tarot Challenge）に入ります。',
      en: 'Enters a Tarot Challenge.',
    },
  },
];

export const VARIABLES: readonly VariableSpec[] = [
  {
    name: 'Score',
    category: 'general',
    description: { ja: '現在のスコア', en: 'Current score' },
  },
  {
    name: 'PPAfterPrestige',
    category: 'general',
    description: { ja: 'プレステージ後に獲得できる PP', en: 'Prestige Points gained on Prestige' },
  },
  {
    name: 'IP',
    category: 'infinity',
    description: { ja: '現在のインフィニティポイント (IP)', en: 'Current Infinity Points (IP)' },
  },
  {
    name: 'EP',
    category: 'eternity',
    description: { ja: '現在のエタニティポイント (EP)', en: 'Current Eternity Points (EP)' },
  },
  {
    name: 'AP',
    category: 'eternity',
    description: { ja: '現在のアセンションポイント (AP)', en: 'Current Ascension Points (AP)' },
  },
  {
    name: 'Supernova',
    category: 'eternity',
    description: { ja: '現在の超新星回数 (Supernova)', en: 'Current Supernova count' },
  },
  {
    name: 'DP',
    category: 'dilation',
    description: { ja: '現在のダイレーションポイント (DP)', en: 'Current Dilation Points (DP)' },
  },
  {
    name: 'DTP',
    category: 'dilation',
    description: { ja: 'ダイレーションツリーポイント総数 (DTP)', en: 'Total Dilation Tree Points (DTP)' },
  },
  {
    name: 'UnityLevel',
    category: 'unity',
    description: { ja: '現在のユニティレベル', en: 'Current Unity level' },
  },
  {
    name: 'AttackLevel',
    category: 'unity',
    description: { ja: '現在の攻撃レベル', en: 'Current Attack level' },
  },
  {
    name: 'GoldAfterUnity',
    category: 'unity',
    description: { ja: 'ユニティ後に獲得できるゴールド', en: 'Gold gained after Unity' },
  },
  {
    name: 'MaxMineralLevelThisRun',
    category: 'minerals',
    description: { ja: 'この周回での最大ミネラルレベル', en: 'Maximum mineral level reached this run' },
  },
  {
    name: 'Atoms',
    category: 'minerals',
    description: { ja: '現在のアトム数', en: 'Current Atoms count' },
  },
  {
    name: 'Epsilon',
    category: 'minerals',
    description: { ja: '現在のイプシロン値', en: 'Current Epsilon value' },
  },
];

export const COMMAND_MAP: ReadonlyMap<string, CommandSpec> = new Map(
  COMMANDS.map((cmd) => [cmd.name, cmd]),
);

export const VARIABLE_MAP: ReadonlyMap<string, VariableSpec> = new Map(
  VARIABLES.map((v) => [v.name, v]),
);

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const chA = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = chA === b.charCodeAt(j - 1) ? 0 : 1;
      const del = (prev[j] ?? 0) + 1;
      const ins = (curr[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j] ?? 0;
    }
  }

  return prev[n] ?? 0;
}

export function findClosestMatch(
  input: string,
  candidates: Iterable<string>,
  maxDistance = 3,
): string | null {
  const lowerInput = input.toLowerCase();
  let best: string | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase();
    if (lowerCandidate === lowerInput) {
      return candidate;
    }
    const dist = levenshtein(lowerInput, lowerCandidate);
    if (dist <= maxDistance && dist < bestScore) {
      bestScore = dist;
      best = candidate;
    }
  }

  return best;
}
