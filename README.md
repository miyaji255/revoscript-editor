# RevoScript Studio

*Revolution Idle* のマクロ（RevoScript）をブラウザ上で作成・検証・シミュレーション・整形するための専用ワークベンチ IDE です。  
A browser-based workbench IDE for writing, validating, dry-running, and formatting *Revolution Idle* macros (RevoScript).

## Features

- **RevoScript Language Engine (`src/core/`)**:
  - Dedicated Lexer, Recursive-Descent Parser (supporting nested indentation, `else if`, scientific notation like `1.00e80` / `1.e50` / `100e9000`, and compound logical expressions), AST, and Formatter.
  - Semantic Analyzer detecting unknown commands & variables with Levenshtein typo suggestions and one-click Quick Fixes, argument count/type/range errors, orphan `else` / `else if`, mixed logical operators, space indentation, empty blocks, and unreachable code.
- **Visual Block View & Direct Manipulation**:
  - Live category-colored nested block tree built from the AST, displaying estimated game block slots and nesting depth, with one-click move up/down, duplicate, and delete actions.
- **Interactive Dry-Run Simulator (`src/core/simulator.ts`, `src/core/bignum.ts`)**:
  - Step-by-step and multi-step execution over the AST with arbitrary-exponent BigNum comparison (handles `100e9000` without IEEE-754 overflow) and Revolution Idle's left-to-right logical operator evaluation.
  - Auto-extracted variable inputs, Skip Wait / Reset controls, execution trace log, and live active-line highlighting in CodeMirror.
- **CodeMirror 6 Editor & Command Palette (`Ctrl+K`)**:
  - Syntax highlighting, AST code folding, automatic block indentation on `Enter`, context-aware autocomplete (`Ctrl+Space`), rich hover docs, inline lint quick-fixes, search (`Ctrl+F`), formatting (`Shift+Alt+F`), and keyboard-first Command Palette (`Ctrl+K`).
- **Multi-Tab Workspace**:
  - Multiple macro tabs persisted locally in `localStorage`, Dark/Light themes, and Japanese/English UI switching.

## Architecture

- `src/core/`: UI-independent specification, lexer, AST, parser, analyzer, formatter, metrics, BigNum comparator, simulator, block structural operations, and progression templates.
- `src/editor/`: CodeMirror 6 integration (`StreamLanguage`, `foldService`, `indentService`, completion, hover tooltips, linter, simulator line highlight, themes).
- `src/state/`: Workspace state management (`localStorage`) and bilingual UI strings.
- `src/components/`: React 19 UI components (`TopBar`, `WorkbenchPanel`, `CommandPalette`, `DiagnosticsPanel`, `StatusBar`, `Toast`).

## Development

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm dev
pnpm build
```

The GitHub Actions workflow builds and deploys to GitHub Pages. Set the Pages source to **GitHub Actions** in repository settings.

References: [Japanese wiki](https://wikiwiki.jp/revoidle/Macro), [English wiki](https://revolutionidle.wiki.gg/wiki/Macro_Builder), [Macro templates](https://revolutionidle.wiki.gg/wiki/Macro_Templates). Game behavior and syntax may change; verify scripts in the game.
