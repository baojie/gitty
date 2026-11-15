import type { MainMessages } from '../shared/messages'

// ── Language tables ─────────────────────────────────────────────────────────

const en: MainMessages = {
  menu: {
    file: 'File',
    openRepo: 'Open Repository…',
    closeRepo: 'Close Repository',
    settings: 'Settings…',
    closeWindow: 'Close Window',
    quit: 'Quit',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    delete: 'Delete',
    selectAll: 'Select All',
    view: 'View',
    refresh: 'Refresh',
    reload: 'Reload',
    devTools: 'Toggle Developer Tools',
    actualSize: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fullscreen: 'Toggle Full Screen',
    help: 'Help',
    about: 'About Gitty',
    shortcuts: 'Keyboard Shortcuts',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: 'Open Repository',
    notARepo: 'Not a repository',
    notInsideWorkTree: (path: string) =>
      `${path} is not inside a git work tree.`,
    deleteTitle: 'Delete File',
    deleteConfirm: (name: string) => `Move ${name} to the trash?`,
    deleteDetail:
      'The file goes to the system trash, and the work tree shows it as deleted.',
    deleteButton: 'Delete',
    cancelButton: 'Cancel',
    deleteFailed: 'Could not delete the file',
    deletePermanentConfirm: (name: string) => `Delete ${name} permanently?`,
    deletePermanentDetail:
      'This system has no trash to move it to. A tracked file can still be restored with git; an untracked one cannot.',
    deletePermanentButton: 'Delete Permanently',
    discardTitle: 'Discard Changes',
    discardConfirm: (name: string) => `Discard the changes to ${name}?`,
    discardDetail:
      'The file goes back to what the index holds. This cannot be undone — the changes are not in git anywhere.',
    discardButton: 'Discard',
    pasteTitle: 'Paste Files',
    pasteConflict: (n: number) =>
      n === 1 ? 'One file is already there.' : `${n} files are already there.`,
    pasteConflictDetail:
      'Keep both puts "(copy)" in the name of the arriving file; replace overwrites what is there.',
    pasteKeepBothButton: 'Keep Both',
    pasteReplaceButton: 'Replace',
    pasteFailed: 'Could not paste',
    forgetTitle: 'Forget Command',
    forgetConfirm: (command: string) =>
      `Forget "${command}"?`,
    forgetDetail:
      'It goes out of the list the Send to agent button offers. Nothing else changes, and you can type it again.',
    forgetButton: 'Forget',
    rebaseTitle: 'Pull with Rebase',
    rebaseConfirm: 'The branches have diverged. Pull with rebase instead?',
    rebaseDetail:
      'A fast-forward is not possible. Rebasing replays your local commits on top of what the remote has; the work tree must be clean, and a conflict stops the rebase for you to resolve.',
    rebaseButton: 'Rebase',
    quitTitle: 'Quit Gitty',
    quitConfirm: (n: number) => `${n} repositories are open. Quit anyway?`,
    quitDetail: 'They reopen at the next start when Reopen last session is on in Settings.',
    quitButton: 'Quit'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Changes',
    diffTruncated: 'Diff truncated — larger than 2 MB.',
    untrackedOmitted: (n: number) => `${n} more untracked files not shown.`,
    notAnImage: 'Not an image.',
    imageTooLarge: 'Image too large to preview.',
    pdfTooLarge: 'PDF too large to preview.',
    lfsNotFetched: 'Stored with Git LFS; the file itself has not been fetched.',
    done: 'Done.',
    gitFailed: 'git failed',
    nothingToApply: 'Nothing to apply.',
    pathEscapesRepo: 'path escapes the repository',
    changesCount: (n: number) => `${n} changes`,
    untrackedLabel: 'untracked',
    stagedLabel: 'staged',
    unstagedLabel: 'unstaged'
  },
  gource: {
    failed: 'gource failed',
    notInstalled: 'gource is not installed.'
  }
}

const zh: MainMessages = {
  menu: {
    file: '文件',
    openRepo: '打开仓库…',
    closeRepo: '关闭仓库',
    settings: '设置…',
    closeWindow: '关闭窗口',
    quit: '退出',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    delete: '删除',
    selectAll: '全选',
    view: '视图',
    refresh: '刷新',
    reload: '重新加载',
    devTools: '开发者工具',
    actualSize: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    fullscreen: '切换全屏',
    help: '帮助',
    about: '关于 Gitty',
    shortcuts: '键盘快捷键',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: '打开仓库',
    notARepo: '不是仓库',
    notInsideWorkTree: (path: string) =>
      `${path} 不在 git 工作树中。`,
    deleteTitle: '删除文件',
    deleteConfirm: (name: string) => `将 ${name} 移到回收站？`,
    deleteDetail: '文件会被移到系统回收站，工作树中显示为已删除。',
    deleteButton: '删除',
    cancelButton: '取消',
    deleteFailed: '无法删除该文件',
    deletePermanentConfirm: (name: string) => `永久删除 ${name}？`,
    deletePermanentDetail:
      '本系统没有可用的回收站。已跟踪的文件仍可用 git 恢复，未跟踪的则无法恢复。',
    deletePermanentButton: '永久删除',
    discardTitle: '丢弃更改',
    discardConfirm: (name: string) => `丢弃对 ${name} 的更改？`,
    discardDetail:
      '文件将回到暂存区中的内容。此操作无法撤销——这些更改并未记录在 git 的任何地方。',
    discardButton: '丢弃',
    pasteTitle: '粘贴文件',
    pasteConflict: (n: number) => (n === 1 ? '已存在同名文件。' : `已存在 ${n} 个同名文件。`),
    pasteConflictDetail: '保留两者会在新文件名中加上“(copy)”；替换会覆盖原有文件。',
    pasteKeepBothButton: '保留两者',
    pasteReplaceButton: '替换',
    pasteFailed: '无法粘贴',
    forgetTitle: '忘记命令',
    forgetConfirm: (command: string) =>
      `忘记 "${command}"？`,
    forgetDetail:
      '它会从「发送给 agent」按钮的命令列表里移除。其它什么都不变，你随时可以再输入一次。',
    forgetButton: '忘记',
    rebaseTitle: '变基拉取',
    rebaseConfirm: '分支已经分叉，改用变基方式拉取吗？',
    rebaseDetail:
      '无法快进。变基会把你的本地提交重放到远端已有的提交之上；工作区必须干净，遇到冲突变基会停下，交由你解决。',
    rebaseButton: '变基',
    quitTitle: '退出 Gitty',
    quitConfirm: (n: number) => `已打开 ${n} 个仓库，仍要退出吗？`,
    quitDetail: '开启“恢复上次会话”时，下次启动会重新打开它们。',
    quitButton: '退出'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: '变更',
    diffTruncated: '差异已截断 — 大于 2 MB。',
    untrackedOmitted: (n: number) => `还有 ${n} 个未跟踪文件未显示。`,
    notAnImage: '不是图片。',
    imageTooLarge: '图片过大，无法预览。',
    pdfTooLarge: 'PDF 过大，无法预览。',
    lfsNotFetched: '由 Git LFS 存储，文件本身尚未拉取。',
    done: '完成。',
    gitFailed: 'git 执行失败',
    nothingToApply: '没有可应用的内容。',
    pathEscapesRepo: '路径超出仓库范围',
    changesCount: (n: number) => `${n} 个变更`,
    untrackedLabel: '未跟踪',
    stagedLabel: '已暂存',
    unstagedLabel: '未暂存'
  },
  gource: {
    failed: 'gource 运行失败',
    notInstalled: 'gource 未安装。'
  }
}

const ja: MainMessages = {
  menu: {
    file: 'ファイル',
    openRepo: 'リポジトリを開く…',
    closeRepo: 'リポジトリを閉じる',
    settings: '設定…',
    closeWindow: 'ウィンドウを閉じる',
    quit: '終了',
    edit: '編集',
    undo: '元に戻す',
    redo: 'やり直す',
    cut: '切り取り',
    copy: 'コピー',
    paste: '貼り付け',
    delete: '削除',
    selectAll: 'すべてを選択',
    view: '表示',
    refresh: '更新',
    reload: '再読み込み',
    devTools: '開発者ツール',
    actualSize: '実際のサイズ',
    zoomIn: '拡大',
    zoomOut: '縮小',
    fullscreen: '全画面表示に切り替え',
    help: 'ヘルプ',
    about: 'Gitty について',
    shortcuts: 'キーボードショートカット',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: 'リポジトリを開く',
    notARepo: 'リポジトリではありません',
    notInsideWorkTree: (path: string) =>
      `${path} は git ワークツリー内にありません。`,
    deleteTitle: 'ファイルを削除',
    deleteConfirm: (name: string) => `${name} をゴミ箱に移動しますか？`,
    deleteDetail:
      'ファイルはシステムのゴミ箱に移動し、ワークツリーでは削除として表示されます。',
    deleteButton: '削除',
    cancelButton: 'キャンセル',
    deleteFailed: 'ファイルを削除できませんでした',
    deletePermanentConfirm: (name: string) => `${name} を完全に削除しますか？`,
    deletePermanentDetail:
      'このシステムには移動先のゴミ箱がありません。追跡されているファイルは git で復元できますが、追跡されていないファイルは復元できません。',
    deletePermanentButton: '完全に削除',
    discardTitle: '変更を破棄',
    discardConfirm: (name: string) => `${name} への変更を破棄しますか？`,
    discardDetail:
      'ファイルはインデックスの内容に戻ります。取り消せません——この変更は git のどこにも残っていません。',
    discardButton: '破棄',
    pasteTitle: 'ファイルを貼り付け',
    pasteConflict: (n: number) =>
      n === 1 ? '同名のファイルが既にあります。' : `同名のファイルが ${n} 件あります。`,
    pasteConflictDetail:
      '両方を残すと新しいファイル名に「(copy)」が付きます。置き換えると既存のファイルは上書きされます。',
    pasteKeepBothButton: '両方を残す',
    pasteReplaceButton: '置き換える',
    pasteFailed: '貼り付けできませんでした',
    forgetTitle: 'コマンドを削除',
    forgetConfirm: (command: string) =>
      `"${command}" を一覧から削除しますか？`,
    forgetDetail:
      '「agent に送る」ボタンが出す一覧から消えます。ほかは何も変わらず、また入力し直せます。',
    forgetButton: '削除',
    rebaseTitle: 'リベースして取得',
    rebaseConfirm: 'ブランチが分岐しています。リベースして取得しますか？',
    rebaseDetail:
      '早送りできません。リベースはローカルのコミットをリモートの内容の上に適用し直します。作業ツリーはクリーンである必要があり、衝突が起きるとリベースは停止して解決を待ちます。',
    rebaseButton: 'リベース',
    quitTitle: 'Gitty を終了',
    quitConfirm: (n: number) => `${n} 個のリポジトリが開いています。それでも終了しますか？`,
    quitDetail: '「前回のセッションを復元」がオンなら、次回起動時に再び開きます。',
    quitButton: '終了'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: '変更',
    diffTruncated: '差分を省略しました — 2 MB を超えています。',
    untrackedOmitted: (n: number) => `未追跡ファイルがあと ${n} 件あります。`,
    notAnImage: '画像ではありません。',
    imageTooLarge: '画像が大きすぎてプレビューできません。',
    pdfTooLarge: 'PDF が大きすぎてプレビューできません。',
    lfsNotFetched: 'Git LFS で保存されています。ファイル本体は取得されていません。',
    done: '完了しました。',
    gitFailed: 'git の実行に失敗しました',
    nothingToApply: '適用するものがありません。',
    pathEscapesRepo: 'パスがリポジトリの外を指しています',
    changesCount: (n: number) => `${n} 件の変更`,
    untrackedLabel: '未追跡',
    stagedLabel: 'ステージ済み',
    unstagedLabel: '未ステージ'
  },
  gource: {
    failed: 'gource の実行に失敗しました',
    notInstalled: 'gource がインストールされていません。'
  }
}

const ko: MainMessages = {
  menu: {
    file: '파일',
    openRepo: '저장소 열기…',
    closeRepo: '저장소 닫기',
    settings: '설정…',
    closeWindow: '창 닫기',
    quit: '종료',
    edit: '편집',
    undo: '실행 취소',
    redo: '다시 실행',
    cut: '오려두기',
    copy: '복사',
    paste: '붙여넣기',
    delete: '삭제',
    selectAll: '모두 선택',
    view: '보기',
    refresh: '새로 고침',
    reload: '다시 로드',
    devTools: '개발자 도구',
    actualSize: '실제 크기',
    zoomIn: '확대',
    zoomOut: '축소',
    fullscreen: '전체 화면 전환',
    help: '도움말',
    about: 'Gitty 정보',
    shortcuts: '키보드 단축키',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: '저장소 열기',
    notARepo: '저장소가 아닙니다',
    notInsideWorkTree: (path: string) =>
      `${path}은(는) git 작업 트리 안에 없습니다.`,
    deleteTitle: '파일 삭제',
    deleteConfirm: (name: string) => `${name}을(를) 휴지통으로 옮길까요?`,
    deleteDetail: '파일은 시스템 휴지통으로 이동하고, 작업 트리에는 삭제로 표시됩니다.',
    deleteButton: '삭제',
    cancelButton: '취소',
    deleteFailed: '파일을 삭제할 수 없습니다',
    deletePermanentConfirm: (name: string) => `${name}을(를) 영구히 삭제할까요?`,
    deletePermanentDetail:
      '이 시스템에는 옮길 휴지통이 없습니다. 추적되는 파일은 git으로 되돌릴 수 있지만, 추적되지 않는 파일은 되돌릴 수 없습니다.',
    deletePermanentButton: '영구 삭제',
    discardTitle: '변경 사항 버리기',
    discardConfirm: (name: string) => `${name}의 변경 사항을 버릴까요?`,
    discardDetail:
      '파일은 인덱스의 내용으로 돌아갑니다. 되돌릴 수 없습니다 — 이 변경 사항은 git 어디에도 남아 있지 않습니다.',
    discardButton: '버리기',
    pasteTitle: '파일 붙여넣기',
    pasteConflict: (n: number) =>
      n === 1 ? '같은 이름의 파일이 이미 있습니다.' : `같은 이름의 파일이 ${n}개 있습니다.`,
    pasteConflictDetail:
      '둘 다 유지하면 새 파일 이름에 "(copy)"가 붙고, 바꾸면 기존 파일을 덮어씁니다.',
    pasteKeepBothButton: '둘 다 유지',
    pasteReplaceButton: '바꾸기',
    pasteFailed: '붙여넣을 수 없습니다',
    forgetTitle: '명령 삭제',
    forgetConfirm: (command: string) =>
      `"${command}" 을(를) 목록에서 지울까요?`,
    forgetDetail:
      '‘agent에게 보내기’ 버튼이 제공하는 목록에서 빠집니다. 다른 것은 그대로이고, 다시 입력할 수 있습니다.',
    forgetButton: '삭제',
    rebaseTitle: '리베이스로 가져오기',
    rebaseConfirm: '브랜치가 갈라졌습니다. 리베이스로 가져올까요?',
    rebaseDetail:
      '빨리 감기가 불가능합니다. 리베이스는 로컬 커밋을 원격의 내용 위에 다시 적용합니다. 작업 트리가 깨끗해야 하며, 충돌이 나면 리베이스가 멈추고 해결을 기다립니다.',
    rebaseButton: '리베이스',
    quitTitle: 'Gitty 종료',
    quitConfirm: (n: number) => `저장소 ${n}개가 열려 있습니다. 그래도 종료할까요?`,
    quitDetail: '「지난 세션 복원」가 켜져 있으면 다음 실행 때 다시 열립니다.',
    quitButton: '종료'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: '변경 사항',
    diffTruncated: 'diff가 잘렸습니다 — 2 MB보다 큽니다.',
    untrackedOmitted: (n: number) => `표시하지 않은 추적되지 않는 파일 ${n}개.`,
    notAnImage: '이미지가 아닙니다.',
    imageTooLarge: '이미지가 너무 커서 미리 볼 수 없습니다.',
    pdfTooLarge: 'PDF가 너무 커서 미리 볼 수 없습니다.',
    lfsNotFetched: 'Git LFS로 저장되어 있으며 파일 자체는 아직 받아오지 않았습니다.',
    done: '완료했습니다.',
    gitFailed: 'git 실행 실패',
    nothingToApply: '적용할 내용이 없습니다.',
    pathEscapesRepo: '경로가 저장소를 벗어납니다',
    changesCount: (n: number) => `${n}개 변경`,
    untrackedLabel: '추적 안 함',
    stagedLabel: '스테이지됨',
    unstagedLabel: '스테이지 안 함'
  },
  gource: {
    failed: 'gource 실행 실패',
    notInstalled: 'gource가 설치되어 있지 않습니다.'
  }
}

const fr: MainMessages = {
  menu: {
    file: 'Fichier',
    openRepo: 'Ouvrir un dépôt…',
    closeRepo: 'Fermer le dépôt',
    settings: 'Paramètres…',
    closeWindow: 'Fermer la fenêtre',
    quit: 'Quitter',
    edit: 'Édition',
    undo: 'Annuler',
    redo: 'Rétablir',
    cut: 'Couper',
    copy: 'Copier',
    paste: 'Coller',
    delete: 'Supprimer',
    selectAll: 'Tout sélectionner',
    view: 'Affichage',
    refresh: 'Actualiser',
    reload: 'Recharger',
    devTools: 'Outils de développement',
    actualSize: 'Taille réelle',
    zoomIn: 'Agrandir',
    zoomOut: 'Réduire',
    fullscreen: 'Basculer en plein écran',
    help: 'Aide',
    about: 'À propos de Gitty',
    shortcuts: 'Raccourcis clavier',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: 'Ouvrir un dépôt',
    notARepo: 'Pas un dépôt',
    notInsideWorkTree: (path: string) =>
      `${path} n'est pas dans une copie de travail git.`,
    deleteTitle: 'Supprimer le fichier',
    deleteConfirm: (name: string) => `Mettre ${name} à la corbeille ?`,
    deleteDetail:
      "Le fichier part à la corbeille du système, et la copie de travail l'affiche comme supprimé.",
    deleteButton: 'Supprimer',
    cancelButton: 'Annuler',
    deleteFailed: 'Impossible de supprimer le fichier',
    deletePermanentConfirm: (name: string) => `Supprimer ${name} définitivement ?`,
    deletePermanentDetail:
      "Ce système n'a pas de corbeille où le déplacer. Un fichier suivi reste récupérable avec git ; un fichier non suivi, non.",
    deletePermanentButton: 'Supprimer définitivement',
    discardTitle: 'Abandonner les modifications',
    discardConfirm: (name: string) => `Abandonner les modifications de ${name} ?`,
    discardDetail:
      "Le fichier revient au contenu de l'index. Irréversible — ces modifications ne sont nulle part dans git.",
    discardButton: 'Abandonner',
    pasteTitle: 'Coller les fichiers',
    pasteConflict: (n: number) =>
      n === 1 ? 'Un fichier du même nom existe déjà.' : `${n} fichiers du même nom existent déjà.`,
    pasteConflictDetail:
      'Conserver les deux ajoute « (copy) » au nom du fichier collé ; remplacer écrase l\'existant.',
    pasteKeepBothButton: 'Conserver les deux',
    pasteReplaceButton: 'Remplacer',
    pasteFailed: 'Impossible de coller',
    forgetTitle: 'Oublier la commande',
    forgetConfirm: (command: string) =>
      `Oublier « ${command} » ?`,
    forgetDetail:
      'Elle quitte la liste proposée par le bouton Envoyer à l’agent. Rien d’autre ne change, et vous pouvez la retaper.',
    forgetButton: 'Oublier',
    rebaseTitle: 'Tirer avec rebase',
    rebaseConfirm: 'Les branches ont divergé. Tirer avec un rebase ?',
    rebaseDetail:
      'L\'avance rapide est impossible. Le rebase rejoue vos commits locaux au-dessus de ce que le dépôt distant contient ; l\'arbre de travail doit être propre, et un conflit interrompt le rebase pour que vous le résolviez.',
    rebaseButton: 'Rebaser',
    quitTitle: 'Quitter Gitty',
    quitConfirm: (n: number) => `${n} dépôts sont ouverts. Quitter quand même ?`,
    quitDetail: 'Ils se rouvrent au prochain démarrage si « Rouvrir la session précédente » est activé.',
    quitButton: 'Quitter'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Modifications',
    diffTruncated: 'Diff tronqué — plus de 2 Mo.',
    untrackedOmitted: (n: number) =>
      `${n} fichier${n === 1 ? '' : 's'} non suivi${n === 1 ? '' : 's'} de plus non affiché${n === 1 ? '' : 's'}.`,
    notAnImage: 'Ce n’est pas une image.',
    imageTooLarge: 'Image trop grande pour un aperçu.',
    pdfTooLarge: 'PDF trop grand pour un aperçu.',
    lfsNotFetched: 'Stocké avec Git LFS ; le fichier lui-même n’a pas été récupéré.',
    done: 'Terminé.',
    gitFailed: 'échec de git',
    nothingToApply: 'Rien à appliquer.',
    pathEscapesRepo: 'le chemin sort du dépôt',
    changesCount: (n: number) => `${n} modification${n === 1 ? '' : 's'}`,
    untrackedLabel: 'non suivi',
    stagedLabel: 'indexé',
    unstagedLabel: 'non indexé'
  },
  gource: {
    failed: 'échec de gource',
    notInstalled: 'gource n’est pas installé.'
  }
}

const de: MainMessages = {
  menu: {
    file: 'Datei',
    openRepo: 'Repository öffnen…',
    closeRepo: 'Repository schließen',
    settings: 'Einstellungen…',
    closeWindow: 'Fenster schließen',
    quit: 'Beenden',
    edit: 'Bearbeiten',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    cut: 'Ausschneiden',
    copy: 'Kopieren',
    paste: 'Einfügen',
    delete: 'Löschen',
    selectAll: 'Alles auswählen',
    view: 'Ansicht',
    refresh: 'Aktualisieren',
    reload: 'Neu laden',
    devTools: 'Entwicklertools',
    actualSize: 'Originalgröße',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    fullscreen: 'Vollbild umschalten',
    help: 'Hilfe',
    about: 'Über Gitty',
    shortcuts: 'Tastaturkürzel',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: 'Repository öffnen',
    notARepo: 'Kein Repository',
    notInsideWorkTree: (path: string) =>
      `${path} liegt nicht in einem Git-Arbeitsverzeichnis.`,
    deleteTitle: 'Datei löschen',
    deleteConfirm: (name: string) => `${name} in den Papierkorb verschieben?`,
    deleteDetail:
      'Die Datei wandert in den Papierkorb des Systems, im Arbeitsverzeichnis erscheint sie als gelöscht.',
    deleteButton: 'Löschen',
    cancelButton: 'Abbrechen',
    deleteFailed: 'Die Datei konnte nicht gelöscht werden',
    deletePermanentConfirm: (name: string) => `${name} endgültig löschen?`,
    deletePermanentDetail:
      'Dieses System hat keinen Papierkorb, in den sie verschoben werden könnte. Eine versionierte Datei lässt sich mit git wiederherstellen, eine unversionierte nicht.',
    deletePermanentButton: 'Endgültig löschen',
    discardTitle: 'Änderungen verwerfen',
    discardConfirm: (name: string) => `Die Änderungen an ${name} verwerfen?`,
    discardDetail:
      'Die Datei fällt auf den Stand des Index zurück. Das lässt sich nicht rückgängig machen — diese Änderungen stehen nirgends in git.',
    discardButton: 'Verwerfen',
    pasteTitle: 'Dateien einfügen',
    pasteConflict: (n: number) =>
      n === 1 ? 'Eine Datei ist bereits vorhanden.' : `${n} Dateien sind bereits vorhanden.`,
    pasteConflictDetail:
      'Beide behalten hängt „(copy)“ an den Namen der eingefügten Datei; Ersetzen überschreibt die vorhandene.',
    pasteKeepBothButton: 'Beide behalten',
    pasteReplaceButton: 'Ersetzen',
    pasteFailed: 'Einfügen nicht möglich',
    forgetTitle: 'Befehl vergessen',
    forgetConfirm: (command: string) =>
      `„${command}“ vergessen?`,
    forgetDetail:
      'Er verschwindet aus der Liste der Schaltfläche „An Agent senden“. Sonst ändert sich nichts, und Sie können ihn erneut eingeben.',
    forgetButton: 'Vergessen',
    rebaseTitle: 'Mit Rebase holen',
    rebaseConfirm: 'Die Branches sind auseinandergelaufen. Stattdessen mit Rebase holen?',
    rebaseDetail:
      'Ein Fast-Forward ist nicht möglich. Beim Rebase werden deine lokalen Commits auf den Stand des Remotes neu aufgesetzt; der Arbeitsbaum muss sauber sein, und ein Konflikt hält den Rebase an, damit du ihn auflöst.',
    rebaseButton: 'Rebase',
    quitTitle: 'Gitty beenden',
    quitConfirm: (n: number) => `${n} Repositorys sind geöffnet. Trotzdem beenden?`,
    quitDetail: 'Ist „Letzte Sitzung wiederherstellen“ an, öffnen sie sich beim nächsten Start wieder.',
    quitButton: 'Beenden'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Änderungen',
    diffTruncated: 'Diff gekürzt — größer als 2 MB.',
    untrackedOmitted: (n: number) =>
      `${n} weitere nicht verfolgte Dateien werden nicht angezeigt.`,
    notAnImage: 'Kein Bild.',
    imageTooLarge: 'Bild zu groß für eine Vorschau.',
    pdfTooLarge: 'PDF zu groß für eine Vorschau.',
    lfsNotFetched: 'Mit Git LFS gespeichert; die Datei selbst wurde nicht geholt.',
    done: 'Fertig.',
    gitFailed: 'git fehlgeschlagen',
    nothingToApply: 'Nichts anzuwenden.',
    pathEscapesRepo: 'Pfad verlässt das Repository',
    changesCount: (n: number) => `${n} Änderungen`,
    untrackedLabel: 'nicht verfolgt',
    stagedLabel: 'vorgemerkt',
    unstagedLabel: 'nicht vorgemerkt'
  },
  gource: {
    failed: 'gource fehlgeschlagen',
    notInstalled: 'gource ist nicht installiert.'
  }
}

const es: MainMessages = {
  menu: {
    file: 'Archivo',
    openRepo: 'Abrir repositorio…',
    closeRepo: 'Cerrar repositorio',
    settings: 'Ajustes…',
    closeWindow: 'Cerrar ventana',
    quit: 'Salir',
    edit: 'Editar',
    undo: 'Deshacer',
    redo: 'Rehacer',
    cut: 'Cortar',
    copy: 'Copiar',
    paste: 'Pegar',
    delete: 'Eliminar',
    selectAll: 'Seleccionar todo',
    view: 'Vista',
    refresh: 'Actualizar',
    reload: 'Recargar',
    devTools: 'Herramientas de desarrollo',
    actualSize: 'Tamaño real',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    fullscreen: 'Cambiar a pantalla completa',
    help: 'Ayuda',
    about: 'Acerca de Gitty',
    shortcuts: 'Atajos de teclado',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: 'Abrir repositorio',
    notARepo: 'No es un repositorio',
    notInsideWorkTree: (path: string) =>
      `${path} no está dentro de un árbol de trabajo de git.`,
    deleteTitle: 'Eliminar archivo',
    deleteConfirm: (name: string) => `¿Mover ${name} a la papelera?`,
    deleteDetail:
      'El archivo va a la papelera del sistema, y el árbol de trabajo lo muestra como eliminado.',
    deleteButton: 'Eliminar',
    cancelButton: 'Cancelar',
    deleteFailed: 'No se pudo eliminar el archivo',
    deletePermanentConfirm: (name: string) => `¿Eliminar ${name} de forma permanente?`,
    deletePermanentDetail:
      'Este sistema no tiene papelera a la que moverlo. Un archivo versionado se puede recuperar con git; uno sin seguimiento, no.',
    deletePermanentButton: 'Eliminar permanentemente',
    discardTitle: 'Descartar cambios',
    discardConfirm: (name: string) => `¿Descartar los cambios de ${name}?`,
    discardDetail:
      'El archivo vuelve a lo que contiene el índice. No se puede deshacer: esos cambios no están en ninguna parte de git.',
    discardButton: 'Descartar',
    pasteTitle: 'Pegar archivos',
    pasteConflict: (n: number) =>
      n === 1 ? 'Ya hay un archivo con ese nombre.' : `Ya hay ${n} archivos con esos nombres.`,
    pasteConflictDetail:
      'Conservar ambos añade «(copy)» al nombre del archivo pegado; reemplazar sobrescribe el existente.',
    pasteKeepBothButton: 'Conservar ambos',
    pasteReplaceButton: 'Reemplazar',
    pasteFailed: 'No se pudo pegar',
    forgetTitle: 'Olvidar comando',
    forgetConfirm: (command: string) =>
      `¿Olvidar «${command}»?`,
    forgetDetail:
      'Sale de la lista que ofrece el botón Enviar al agente. Nada más cambia, y puedes volver a escribirlo.',
    forgetButton: 'Olvidar',
    rebaseTitle: 'Traer con rebase',
    rebaseConfirm: 'Las ramas han divergido. ¿Traer con rebase?',
    rebaseDetail:
      'No es posible un avance rápido. El rebase vuelve a aplicar tus commits locales sobre lo que tiene el remoto; el árbol de trabajo debe estar limpio y un conflicto detiene el rebase para que lo resuelvas.',
    rebaseButton: 'Rebase',
    quitTitle: 'Salir de Gitty',
    quitConfirm: (n: number) => `Hay ${n} repositorios abiertos. ¿Salir de todos modos?`,
    quitDetail: 'Se vuelven a abrir en el próximo inicio si «Reabrir la sesión anterior» está activado.',
    quitButton: 'Salir'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Cambios',
    diffTruncated: 'Diff truncado — supera los 2 MB.',
    untrackedOmitted: (n: number) =>
      `${n} archivo${n === 1 ? '' : 's'} sin seguimiento más que no se muestra${n === 1 ? '' : 'n'}.`,
    notAnImage: 'No es una imagen.',
    imageTooLarge: 'La imagen es demasiado grande para previsualizarla.',
    pdfTooLarge: 'El PDF es demasiado grande para previsualizarlo.',
    lfsNotFetched: 'Almacenado con Git LFS; el archivo en sí no se ha descargado.',
    done: 'Hecho.',
    gitFailed: 'git falló',
    nothingToApply: 'Nada que aplicar.',
    pathEscapesRepo: 'la ruta se sale del repositorio',
    changesCount: (n: number) => `${n} cambio${n === 1 ? '' : 's'}`,
    untrackedLabel: 'sin seguimiento',
    stagedLabel: 'preparado',
    unstagedLabel: 'sin preparar'
  },
  gource: {
    failed: 'gource falló',
    notInstalled: 'gource no está instalado.'
  }
}

const ru: MainMessages = {
  menu: {
    file: 'Файл',
    openRepo: 'Открыть репозиторий…',
    closeRepo: 'Закрыть репозиторий',
    settings: 'Настройки…',
    closeWindow: 'Закрыть окно',
    quit: 'Выйти',
    edit: 'Правка',
    undo: 'Отменить',
    redo: 'Повторить',
    cut: 'Вырезать',
    copy: 'Копировать',
    paste: 'Вставить',
    delete: 'Удалить',
    selectAll: 'Выделить всё',
    view: 'Вид',
    refresh: 'Обновить',
    reload: 'Перезагрузить',
    devTools: 'Инструменты разработчика',
    actualSize: 'Реальный размер',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    fullscreen: 'Переключить полноэкранный режим',
    help: 'Справка',
    about: 'О программе Gitty',
    shortcuts: 'Сочетания клавиш',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: 'Открыть репозиторий',
    notARepo: 'Это не репозиторий',
    notInsideWorkTree: (path: string) =>
      `${path} не находится в рабочем дереве git.`,
    deleteTitle: 'Удалить файл',
    deleteConfirm: (name: string) => `Переместить ${name} в корзину?`,
    deleteDetail:
      'Файл отправится в системную корзину, а в рабочем дереве появится как удалённый.',
    deleteButton: 'Удалить',
    cancelButton: 'Отмена',
    deleteFailed: 'Не удалось удалить файл',
    deletePermanentConfirm: (name: string) => `Удалить ${name} безвозвратно?`,
    deletePermanentDetail:
      'В этой системе нет корзины, куда его переместить. Отслеживаемый файл можно вернуть через git, неотслеживаемый — нет.',
    deletePermanentButton: 'Удалить безвозвратно',
    discardTitle: 'Отменить изменения',
    discardConfirm: (name: string) => `Отменить изменения в ${name}?`,
    discardDetail:
      'Файл вернётся к содержимому индекса. Это необратимо — этих изменений нигде нет в git.',
    discardButton: 'Отменить',
    pasteTitle: 'Вставить файлы',
    pasteConflict: (n: number) =>
      n === 1 ? 'Файл с таким именем уже есть.' : `Файлов с такими именами уже ${n}.`,
    pasteConflictDetail:
      'Сохранить оба — к имени вставляемого файла добавится «(copy)»; заменить — существующий будет перезаписан.',
    pasteKeepBothButton: 'Сохранить оба',
    pasteReplaceButton: 'Заменить',
    pasteFailed: 'Не удалось вставить',
    forgetTitle: 'Забыть команду',
    forgetConfirm: (command: string) =>
      `Забыть «${command}»?`,
    forgetDetail:
      'Она исчезнет из списка кнопки «Отправить агенту». Больше ничего не меняется, её можно ввести снова.',
    forgetButton: 'Забыть',
    rebaseTitle: 'Получить с ребейзом',
    rebaseConfirm: 'Ветки разошлись. Получить с ребейзом?',
    rebaseDetail:
      'Перемотка невозможна. Ребейз заново применяет ваши локальные коммиты поверх того, что есть на удалённом репозитории; рабочее дерево должно быть чистым, а конфликт останавливает ребейз, чтобы вы его разрешили.',
    rebaseButton: 'Ребейз',
    quitTitle: 'Выйти из Gitty',
    quitConfirm: (n: number) => `Открыто репозиториев: ${n}. Всё равно выйти?`,
    quitDetail: 'Если включено «Восстановить прошлый сеанс», при следующем запуске они откроются снова.',
    quitButton: 'Выйти'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Изменения',
    diffTruncated: 'Diff обрезан — больше 2 МБ.',
    untrackedOmitted: (n: number) => `Ещё ${n} неотслеживаемых файлов не показано.`,
    notAnImage: 'Это не изображение.',
    imageTooLarge: 'Изображение слишком велико для предпросмотра.',
    pdfTooLarge: 'PDF слишком велик для предпросмотра.',
    lfsNotFetched: 'Хранится в Git LFS; сам файл не загружен.',
    done: 'Готово.',
    gitFailed: 'git завершился с ошибкой',
    nothingToApply: 'Нечего применять.',
    pathEscapesRepo: 'путь выходит за пределы репозитория',
    changesCount: (n: number) => `${n} изменений`,
    untrackedLabel: 'не отслеживается',
    stagedLabel: 'проиндексировано',
    unstagedLabel: 'не проиндексировано'
  },
  gource: {
    failed: 'gource завершился с ошибкой',
    notInstalled: 'gource не установлен.'
  }
}

const pt: MainMessages = {
  menu: {
    file: 'Ficheiro',
    openRepo: 'Abrir repositório…',
    closeRepo: 'Fechar repositório',
    settings: 'Definições…',
    closeWindow: 'Fechar janela',
    quit: 'Sair',
    edit: 'Editar',
    undo: 'Anular',
    redo: 'Repetir',
    cut: 'Cortar',
    copy: 'Copiar',
    paste: 'Colar',
    delete: 'Eliminar',
    selectAll: 'Selecionar tudo',
    view: 'Vista',
    refresh: 'Atualizar',
    reload: 'Recarregar',
    devTools: 'Ferramentas de programador',
    actualSize: 'Tamanho real',
    zoomIn: 'Ampliar',
    zoomOut: 'Reduzir',
    fullscreen: 'Alternar ecrã inteiro',
    help: 'Ajuda',
    about: 'Sobre o Gitty',
    shortcuts: 'Atalhos de teclado',
    github: 'GitHub'
  },
  dialog: {
    openRepoTitle: 'Abrir repositório',
    notARepo: 'Não é um repositório',
    notInsideWorkTree: (path: string) =>
      `${path} não está dentro de uma árvore de trabalho do git.`,
    deleteTitle: 'Eliminar ficheiro',
    deleteConfirm: (name: string) => `Mover ${name} para o lixo?`,
    deleteDetail:
      'O ficheiro vai para o lixo do sistema, e a árvore de trabalho mostra-o como eliminado.',
    deleteButton: 'Eliminar',
    cancelButton: 'Cancelar',
    deleteFailed: 'Não foi possível eliminar o ficheiro',
    deletePermanentConfirm: (name: string) => `Eliminar ${name} definitivamente?`,
    deletePermanentDetail:
      'Este sistema não tem lixo para onde o mover. Um ficheiro versionado ainda pode ser recuperado com git; um não versionado, não.',
    deletePermanentButton: 'Eliminar definitivamente',
    discardTitle: 'Descartar alterações',
    discardConfirm: (name: string) => `Descartar as alterações de ${name}?`,
    discardDetail:
      'O ficheiro volta ao que o índice contém. Não há como desfazer — estas alterações não estão em lado nenhum do git.',
    discardButton: 'Descartar',
    pasteTitle: 'Colar ficheiros',
    pasteConflict: (n: number) =>
      n === 1 ? 'Já existe um ficheiro com esse nome.' : `Já existem ${n} ficheiros com esses nomes.`,
    pasteConflictDetail:
      'Manter ambos acrescenta «(copy)» ao nome do ficheiro colado; substituir sobrepõe o existente.',
    pasteKeepBothButton: 'Manter ambos',
    pasteReplaceButton: 'Substituir',
    pasteFailed: 'Não foi possível colar',
    forgetTitle: 'Esquecer comando',
    forgetConfirm: (command: string) =>
      `Esquecer «${command}»?`,
    forgetDetail:
      'Sai da lista que o botão Enviar ao agente oferece. Nada mais muda, e pode escrevê-lo outra vez.',
    forgetButton: 'Esquecer',
    rebaseTitle: 'Obter com rebase',
    rebaseConfirm: 'Os ramos divergiram. Obter com rebase?',
    rebaseDetail:
      'Não é possível avançar rapidamente. O rebase reaplica os teus commits locais sobre o que o remoto tem; a árvore de trabalho tem de estar limpa e um conflito interrompe o rebase para o resolveres.',
    rebaseButton: 'Rebase',
    quitTitle: 'Sair do Gitty',
    quitConfirm: (n: number) => `Há ${n} repositórios abertos. Sair mesmo assim?`,
    quitDetail: 'Eles reabrem no próximo início se «Reabrir a sessão anterior» estiver ativado.',
    quitButton: 'Sair'
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Alterações',
    diffTruncated: 'Diff truncado — maior do que 2 MB.',
    untrackedOmitted: (n: number) =>
      `Mais ${n} ficheiro${n === 1 ? '' : 's'} não seguido${n === 1 ? '' : 's'} que não ${n === 1 ? 'é mostrado' : 'são mostrados'}.`,
    notAnImage: 'Não é uma imagem.',
    imageTooLarge: 'Imagem demasiado grande para pré-visualizar.',
    pdfTooLarge: 'PDF demasiado grande para pré-visualizar.',
    lfsNotFetched: 'Armazenado com Git LFS; o ficheiro em si não foi obtido.',
    done: 'Concluído.',
    gitFailed: 'o git falhou',
    nothingToApply: 'Nada a aplicar.',
    pathEscapesRepo: 'o caminho sai do repositório',
    changesCount: (n: number) => `${n} ${n === 1 ? 'alteração' : 'alterações'}`,
    untrackedLabel: 'não seguido',
    stagedLabel: 'preparado',
    unstagedLabel: 'não preparado'
  },
  gource: {
    failed: 'gource falhou',
    notInstalled: 'gource não está instalado.'
  }
}

const ALL: Record<string, MainMessages> = { en, zh, ja, ko, fr, de, es, ru, pt }

// ── Runtime switching ───────────────────────────────────────────────────────

let current: MainMessages = en

export function setMainLocale(locale: string): void {
  current = ALL[locale] ?? en
}

/**
 * Proxy that forwards every access to the current language table. Menu
 * labels, dialog text and notices all read through this — so changing
 * `current` changes what they see without restarting the app.
 */
export const msg = new Proxy({} as MainMessages, {
  get(_target, key: string) {
    return (current as unknown as Record<string, unknown>)[key]
  }
})
