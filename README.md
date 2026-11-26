# Revoscript Studio

Revolution Idle のマクロをブラウザで編集するデスクトップ向けエディターです。 / A desktop browser editor for Revolution Idle macros.

CodeMirror 6 による入力補完、ホバー、検索、色分け、診断、日本語・英語の切り替えに対応しています。編集内容はブラウザに自動保存されます。既知の命令と解析ルールは段階的に追加します。未登録の命令はエラーとして表示します。

Offers CodeMirror 6 completion, hover help, search, highlighting, diagnostics, and Japanese/English UI. Work is saved locally in your browser. The command reference and diagnostics are intentionally incomplete; unknown commands are reported as errors.

## Development

```sh
npm install
npm test
npm run dev
npm run build
```

The GitHub Actions workflow builds and deploys to GitHub Pages. Set the Pages source to **GitHub Actions** in repository settings.

References: [Japanese wiki](https://wikiwiki.jp/revoidle/Macro), [English wiki](https://revolutionidle.wiki.gg/wiki/Macro_Builder), [macro examples](https://revolutionidle.wiki.gg/wiki/Macro_Templates). Game behavior and syntax may change; verify scripts in the game.
