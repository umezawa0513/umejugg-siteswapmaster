# サイトスワップマスター (Siteswap Master)

高精度なジャグリング・サイトスワップのシミュレーション、生成、接続、変換、および解析を行うためのWebアプリケーションです。

## 主な機能

| 機能 | 説明 | 対応ファイル |
| :--- | :--- | :--- |
| **シミュレーション** | サイトスワップをアニメーション表示します。 | `simulation.html` |
| **パターン生成** | ボール数や最大値、周期などの条件を指定して、可能なパターンを列挙します。 | `generator.html` |
| **作る** | サイトスワップを自由に作成・編集します。 | `maker.html` |
| **繋げる** | あるパターンから別のパターンへ移行するための遷移パターンを計算します。 | `transition.html` |
| **確認** | サイトスワップの有効性チェックや、状態遷移などの詳細を解析します。 | `details.html` |
| **変換** | アシンクロサイトスワップのボックス化とシャワー化を行います | `conversion.html` |
| **マルチ化** | アシンクロサイトスワップをマルチプレックス（同時に複数のボールを投げる）パターンへ拡張します。 | `multi.html` |
| **共有** | 作成したパターンをリンクとして書き出し、簡単に共有できます。 | `share.html` |
| **埋め込み** | Webサイトにシミュレーターを埋め込むための軽量ビューアです。 | `embed.html` |

## 現在のバージョン

各ファイルの現在の最新バージョン一覧です。

| ファイル名 | バージョン | 説明 |
| :--- | :--- | :--- |
| `simulation.css` | `9.3.6` | 共通スタイルシート |
| `syncModal.css` | `1.0.1` | 入力モーダル用スタイル |
| `simulation.min.js` | `9.3.2` | シミュレーター・コアエンジン |
| `siteswapLab.js` | `1.5.6` | 数値計算・ロジックライブラリ |
| `siteswapProcessor.js` | `1.1.4` | サイトスワップ解析・データ処理 |
| `siteswapMaker.js` | `1.5.1` | オリジナルパターン作成補助 |
| `siteswapGenerator.js` | `1.0.0` | パターン生成エンジン |
| `syncPatternInput.js` | `1.0.1` | パターン入力支援インターフェース |
| `canvasRecorder.js` | `1.6.0` | canvas の描画内容を MP4 動画として保存する汎用録画ライブラリ |
| `vendor/mp4-muxer-*.min.js` | `5.2.1` | H.264 を MP4 コンテナへ結合する外部ライブラリ（自己ホスト） |

## 動画保存 (canvasRecorder.js)

シミュレーター画面では、canvas のアニメーションを **MP4 動画として保存**できます。
「動画を保存」ボタンを押すと 6 秒間録画して保存します。
（`fixedDuration` を指定しない場合は、押下後に録画する長さを選択する UI になります）

- **仕組み**: WebCodecs (`VideoEncoder`) でフレームをエンコードし、[`mp4-muxer`](https://github.com/Vanilagy/mp4-muxer) で H.264 MP4 を生成します。
- **背景色**: canvas は透過のため、録画時は背景色を合成して保存します（MP4 は透過非対応）。
- **対応環境**: WebCodecs 対応ブラウザ（Chrome / Edge / Safari 16.4+ / Firefox 130+）。未対応、または `mp4-muxer` が読み込めない場合は録画ボタン自体を表示しません。
- **ライブラリの自己ホスト**: `mp4-muxer` は CDN ではなく `vendor/mp4-muxer-<version>.min.js` として同梱します。更新時は同フォルダのファイルを差し替え、HTML の `<script>` パスと本 README のバージョンを更新してください。
- **汎用ライブラリ**: 特定アプリに依存しないため、他の canvas を持つページでも再利用できます。

```html
<script src="vendor/mp4-muxer-5.2.1.min.js"></script>
<script src="canvasRecorder.js"></script>
<script>
  const recorder = new CanvasRecorder({
    canvas: '#canvas',          // 対象 canvas (セレクタ or 要素)
    fixedDuration: 6,           // 押下で即録画する秒数 (未指定なら秒数選択UI)
    fileName: 'my-recording',   // 保存ファイル名 (文字列 or 関数, 拡張子除く)
    backgroundColor: 'auto',    // 'auto' | 色文字列 | 色を返す関数
  });
  recorder.mount('#recorder-ui'); // ボタン UI を任意要素に挿入
</script>
```

## 使い方

### Webで利用する（推奨）
インストール不要で、ブラウザからすぐに利用できます。

**[サイトスワップマスターを利用する](https://umejugg.com/siteswapmaster/home)**

---

### ローカル・自身のサーバーで利用する
- **ローカルで直接開く**: リポジトリをダウンロードし、 `home.html` をブラウザで開いてください。
- **Webサイトに埋め込む**: 詳細は **[埋め込みガイド](https://umejugg.com/siteswapmaster/embed-document)** を参照してください。

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。
詳細は `LICENSE` ファイルを参照してください。

Copyright (c) 2026 umezawa0513
