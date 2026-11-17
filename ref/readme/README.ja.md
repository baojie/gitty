# Gitty

[English](../../README.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Русский](README.ru.md) · [Português](README.pt.md)

> **翻訳日: 2026-11-18（Gitty v0.2.3 に対応）。**
> 公式版は[英語版 README](../../README.md) であり、継続的に更新されるのはそちらだ
> けです。この文書はその時点のスナップショットで、食い違いがある場合は英語版が正
> です。この文書は本ファイルだけを対象としており、[マニュアル](manual.ja.md)には
> 独自の翻訳があって、そちらでも英語版が公式です。UI 自体は英語なので、ボタン名や
> メニュー項目は原文のまま残しています。

デスクトップ向けの 4 ペイン構成の git 履歴ブラウザ。`lazygit` の系譜にありながら、
マウス操作が本物です。ダブルクリックでファイルを開き、右クリックでパスをコピー
し、コミットを 2 つクリックすれば差分が出ます。

```
┌──────────────────────┬──────────────────────┐
│ Changes              │ Diff                 │
│ (or a commit's files)│ (unified, coloured)  │
├──────────────────────┼──────────────────────┤
│ Commits              │ Terminal             │
│ (log, ↑↓, Enter)     │ (a real shell)       │
└──────────────────────┴──────────────────────┘
```

すべてのペインは仕切りをドラッグしてサイズを変えられ、どれも隠して呼び戻せます —
[全画面と非表示](manual.ja.md#full-screen-and-hiding)を参照。

他の git ブラウザではあまり見かけない点:

- **履歴の隣に本物のシェルが常駐。** git を呼ぶだけのウィジェットではなく、リポジ
  トリをルートとする本物のログインシェル (`$SHELL`) が、差分と同じウィンドウにあり
  ます。多くの git ブラウザはターミナルを外に置くので、思いつきを確かめるだけでウィ
  ンドウを行き来することになります。ここではすぐそこにあり、リポジトリが変われば他
  のペインもすべて更新されます。
- **コミットメッセージ欄ではなく、agent で終わるステージング。** ファイル単位、
  hunk 単位、あるいは選択した行だけをステージし、**Send** があなた自身のコマンド —
  `claude "commit the staged changes"`、`codex exec …`、普段使っているもの — を下の
  シェルに打ち込んで Enter を押します。メッセージを書くのは agent の仕事。*どの変更
  を 1 つのコミットにするか*を決めるのがあなたの仕事で、4 つのペインはそのためにあり
  ます。Gitty の内部からモデルは一切呼ばれないので、自分で送っていないものがこのマシ
  ンを出ることはありません。
- **差分だけでなくドキュメントも。** Markdown は描画され、HTML はサンドボックス化
  されたフレームで表示され、画像は絵として表示されます — いずれも、いま見ているリビ
  ジョンでの姿です。2 年前の README が、*その*コミットが出荷した当時のスクリーン
  ショット付きで描画されます。オブジェクトデータベースからそのまま読み出すので、ディ
  スク上のものは一切関与せず、ウェブから取得することもありません。他人の README を読
  むのに、その相手のホストへ挨拶しに行く必要はないからです。
- **描画済み Markdown でも、ファイル内のどこにいるかがわかる。**
  **Markdown source lines** をオンにすると、見出し・段落・リスト項目・表・フェンス付
  きブロック・画像のすべてが、ソースで始まる行番号を左のガターに表示します。読みなが
  ら見つけた一節を、行単位で編集できるようにするためです。
- **差分、blame、ファイル履歴、描画済み README を一度に開ける。** ファイルは差分の
  上ではなく*隣*に自分のタブとして開き、それぞれが開かれたリビジョンを覚えています。
  ファイルを読むために、いま見ていた変更を手放すことはありません。
- **<kbd>Ctrl+F</kbd> が、そのペインに表示中のものなら何にでも効く** — 描画済み
  Markdown も含みます。検索が描画後のテキストを読むため、太字やコードスパンをまたい
  で語句が見つかります。HTML プレビューのフレーム内にも効きます。
- **履歴をブラウザへ提供。** **Open in Browser** はコミット — そのメタデータ、ファイ
  ル、差分 — をシステムのブラウザへ渡します。アプリ内の Web サーバーが `127.0.0.1`
  にバインドされており、その URL にはこのセッション用に発行されたトークンが載りま
  す。コミットは本物の URL なので、アプリが動いている間は、履歴をタブで読み、開いた
  ままにし、ブラウザの検索で探せます。
- **コミットメニューから [gource](https://gource.io/)**（インストールされていれば）。
  リポジトリの全履歴を、独自のウィンドウでアニメーションとして再生します。gource が
  無い場合、その項目は描画されません。動かせないものはダウンロードも提示もしません。
- **9 言語のインターフェースと明示的なタイムゾーン。** git は各コミットを作者のオフ
  セット付きで記録するので、タイムスタンプは常にゾーンの選択です。ここでそれを選べ
  ば、ログ・blame・ファイル履歴・「今日」と日付の境目まで、UI 全体がそれに従います。

![Gitty 0.2.0](../../ref/gitty-0.2.0.png)

## なぜもう一つ作るのか <a id="why-another-one"></a>

手に取ったツールがどれも一点ずつ外していたからです:

- **各種 IDE** — 重すぎ、遅すぎ。(本当に、見つけられる限り全部試しました。)
- **lazygit、grv** — 優れたツールですが、マウスとテキスト選択に不親切。
- **gitui** — コミット一覧と差分を同時に画面に置きたい。
- **SmartGit、GitKraken** — Java、重い、古臭い、しかも有料。
- **gitg** の類 — これもコミット一覧と差分が並びません。
- **tig** — 差分のみで、辿れるファイルツリーがない。
- **gitk** — 見た目が!

さらに、欲しかったのにほとんど提供されていなかったものが 2 つ: **Markdown プレ
ビュー**と、ウィンドウのどこでも**まともに動くコピー & ペースト**です。

## 動作要件 <a id="requirements"></a>

- `PATH` 上に `git`
- デスクトップセッションのある Linux、macOS または Windows
- Node.js 22.12 以降 — 下記の npm 版とソース版のインストールにのみ必要です。`.deb`
  は自前のランタイムを同梱しています
- オプションで [gource](https://gource.io/) が `PATH` 上にあれば
  [アニメーション](manual.ja.md#gource)に使えます。無くても何も変わりません。

## 実行 <a id="running"></a>

### パッケージをダウンロード (Linux) <a id="download-a-package-linux"></a>

`.deb` が最短の入り口です。Node もビルドも不要です:

```bash
wget https://github.com/baojie/gitty/releases/download/v0.2.3/gitty-desktop_0.2.3_amd64.deb
sudo dpkg -i gitty-desktop_0.2.3_amd64.deb
```

これで `/usr/bin/gitty`、アイコン付きのアプリケーションメニューエントリがインストー
ルされ、Chromium のサンドボックスを**有効にしたまま**動きます —
[Linux デスクトップ統合](manual.ja.md#linux-desktop-integration)を参照。

隣には [arm64 の `.deb`](https://github.com/baojie/gitty/releases/download/v0.2.3/gitty-desktop_0.2.3_arm64.deb)
があり、dpkg の無いディストリビューション向けには AppImage
（[x86_64](https://github.com/baojie/gitty/releases/download/v0.2.3/Gitty-0.2.3-x86_64.AppImage)、
[arm64](https://github.com/baojie/gitty/releases/download/v0.2.3/Gitty-0.2.3-arm64.AppImage)）
があります。こちらは第二候補です。AppImage はサンドボックスのヘルパーをインストール
できないからです。旧バージョンは[リリースページ](https://github.com/baojie/gitty/releases)
にあります。

### npm から <a id="from-npm"></a>

```bash
npm install -g gitty-desktop      # installs the gitty command globally
```

### チェックアウトから <a id="from-a-checkout"></a>

PATH へリンクします:

```bash
./setup.sh               # symlink into ~/.local/bin (no sudo)
./setup.sh --system      # symlink into /usr/local/bin (needs sudo)
```

`setup.sh` はクリック起動できるランチャーもインストールします — Linux ではデスクトッ
プエントリ、macOS では最小限の `Gitty.app`、Windows ではスタートメニューとデスクトップ
のショートカットです。いずれも同じ `run.sh` をラップし、いずれも未パッケージの
Electron が必要とする回避策を抱えています。
[プラットフォームに関する注記](manual.ja.md#platform-notes)を参照。

あとはどこからでもリポジトリを開けます:

```bash
gitty                    # open the repository in the current directory
gitty /path/to/repo      # open another repository
gitty --fg               # keep it attached to the terminal (Ctrl+C quits)
gitty --dev              # hot-reloading development mode
gitty --any              # start even outside a work tree (what the desktop
                         # entry uses), falling back to the last repositories
```

Gitty はターミナルから切り離れて自分の pid を表示するので、シェルはそのまま使え、閉
じてもウィンドウは道連れになりません。出力は
`${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log` へ書かれ、4 MB を超えると末尾
1 MB に切り詰められます。

`./run.sh` は同じスクリプトで、シンボリックリンクなしでも同じように動きます。ラン
チャーはソースが変わっていれば依存をインストールしてバンドルを再ビルドするので、初回
は少し待つことがあります。`npm run dev`、`npm run build`、`npm start` も直接使えま
す。

ワークツリー外のディレクトリから起動した場合、Gitty は文句を言うだけで終わらず、最後
に開いたリポジトリにフォールバックします。

### Windows の場合 <a id="on-windows"></a>

Windows 向けのインストーラーはありません。チェックアウトから実行してください。
[Git for Windows](https://gitforwindows.org/)（スクリプトはその Git Bash で動きます）
に加えて、Node.js と 64 ビット版 Visual C++ ランタイムが必要です。PowerShell で:

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Microsoft.VCRedist.2015+.x64
```

続いて、Node が見えるように**新しく開いた** Git Bash ウィンドウで:

```bash
git clone https://github.com/baojie/gitty.git && cd gitty
npm install
./setup.sh
```

`setup.sh` は Git Bash 用の `gitty` と、cmd・PowerShell 用の `gitty.cmd` を
`%USERPROFILE%\.local\bin` にインストールし、ショートカットも作ります。以後はどのシェ
ルからでも、リポジトリ内で `gitty` と打てばそれが開きます。Visual Studio は不要です。
`npm install` が *not a valid Win32 application* で失敗したり、git がリポジトリを
*dubious ownership* と言ったりする場合は、[Windows](manual.ja.md#windows) を参照。

## Gitty がやらないこと <a id="what-gitty-does-not-do"></a>

Gitty は履歴を読み、あなたがまとめるべきだと決めたものをステージします。rebase、
merge、cherry-pick、コンフリクト解決、ブランチの作成・削除・切り替えはしません — そ
して学ぶこともありません。それらは状態を持つ複数ステップの操作で、面白い瞬間は何か
がうまくいかなくなった瞬間です。それらすべてを扱えるシェルが同じウィンドウに、すで
に正しいディレクトリで常駐しています。中途半端な rebase ボタンは無いより悪いのです。

コミットボックスもありません。これは聞こえるより小さな話です。足りないのはメッセー
ジではありません。足りないのは*どの変更を 1 つのコミットにするか*を決める場所で、上
述のステージングがそのためのものです。インデックスが 1 つのことを指し示したら、
**Send** がそれを、あなたのメッセージを書くものに手渡します。

## マニュアル <a id="the-manual"></a>

残りのすべて — 各ペイン、各設定、各ショートカット — は**[マニュアル](manual.ja.md)**:

- [ウィンドウ](manual.ja.md#the-window): タイトルバー、戻る・進む、タブ、最近のリポ
  ジトリ、全画面と非表示。
- [各ペイン](manual.ja.md#the-panes): ワーキングツリーとステージング、差分、ファイ
  ルと描画済みドキュメントの表示、コミットログとそのグラフ、ターミナル。
- [テキストの検索](manual.ja.md#finding-text)、
  [設定表](manual.ja.md#settings)、
  [キーボードショートカット](manual.ja.md#keyboard-shortcuts)。
- [プラットフォームに関する注記](manual.ja.md#platform-notes): Linux デスクトップ統
  合、macOS アプリケーションバンドル、Windows、そしてウィンドウが固まったときに Gitty
  が残すログ。

## アーキテクチャ <a id="architecture"></a>

```
src/main       Electron main process — git commands, ptys, fs watchers,
               the recent-repository store, the stall log, IPC
src/preload    contextBridge API exposed to the renderer as window.gitty
src/renderer   React UI — App.tsx manages tabs, RepoTab.tsx owns one
               repository's four panes
src/shared     Types shared by both sides
build          Application icon (SVG source and rendered PNG)
```

git は `execFile('git', …)` で駆動し、`--porcelain=v2 -z` / `--name-status -z` を解析
するので、空白を含むパスやリネームも壊れずに通ります。git ライブラリは一切同梱しませ
ん。`PATH` 上の `git` が何であれ、それが見えているものです。レンダラーは
`contextIsolation` 付き、node 統合なしで動きます。

レンダラーは遅延読み込みされるチャンクに分割されており、xterm、highlight.js、
markdown-it が解析される前にウィンドウが描画されます。この分割 — 4 つのチャンク、重い
ライブラリを温かいチャンクから締め出す規則、新しいものを追加する手順 — は
[ref/spec/lazy-loading.md](../../ref/spec/lazy-loading.md) に規定されています。

## ライセンス <a id="licence"></a>

MIT
