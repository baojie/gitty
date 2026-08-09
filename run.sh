#!/usr/bin/env bash
#
# Launch Gitty.
#
#   gitty                    open the current directory's repository
#   gitty /path/to/repo      open another repository
#   gitty --fg [repo]        stay in the foreground (Ctrl+C quits)
#   gitty --dev [repo]       run with hot reload (electron-vite dev)
#   gitty --any [repo]       start even outside a work tree (desktop launcher)
#   ./run.sh ...             same, but resolved from this checkout
#
# Gitty detaches from the terminal by default; its output goes to
# ${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log
#
set -euo pipefail

# Resolve symlinks so `gitty` (installed via setup.sh) finds this checkout.
SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
HERE="$(cd "$(dirname "$SCRIPT")" && pwd)"
CALLER_PWD="$PWD"

DEV=0
FOREGROUND=0
ANY=0
REPO=""
for arg in "$@"; do
  case "$arg" in
    --dev|-d) DEV=1 ;;
    --fg|--foreground|-f) FOREGROUND=1 ;;
    --any|-a) ANY=1 ;;
    -h|--help) sed -n '2,14p' "$SCRIPT" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) REPO="$arg" ;;
  esac
done

REPO="${REPO:-$CALLER_PWD}"
if [ -d "$REPO" ]; then
  REPO="$(cd "$REPO" && pwd)"
  if ! git -C "$REPO" rev-parse --show-toplevel >/dev/null 2>&1; then
    if [ "$ANY" -eq 1 ]; then
      # Not a work tree; let the app fall back to the last repositories opened.
      REPO=""
    else
      echo "gitty: $REPO is not inside a git work tree" >&2
      exit 1
    fi
  fi
elif [ "$ANY" -eq 1 ]; then
  REPO=""
else
  echo "gitty: no such directory: $REPO" >&2
  exit 1
fi

cd "$HERE"

if [ ! -d node_modules ]; then
  echo "gitty: installing dependencies..."
  npm install
fi

# Run without the SUID chrome-sandbox (avoids the "owned by root, mode 4755"
# abort on machines where node_modules can't carry setuid binaries).
export ELECTRON_DISABLE_SANDBOX=1

if [ -n "$REPO" ]; then
  export GITTY_REPO="$REPO"
fi

if [ "$DEV" -eq 1 ]; then
  exec npx electron-vite dev
fi

# Rebuild when the bundle is missing or any source file is newer than it.
if [ ! -f out/main/index.js ] || [ -n "$(find src electron.vite.config.ts -newer out/main/index.js 2>/dev/null)" ]; then
  echo "gitty: building..."
  npm run build
fi

# Resolve Electron's real binary through the package itself. require('electron')
# reads node_modules/electron/path.txt and returns the platform's actual path
# (dist/electron on Linux, dist/Electron.app/Contents/MacOS/Electron on macOS),
# or throws when the postinstall download never completed and path.txt is empty.
# The old `[ -x dist/electron ]` heuristic missed that failure: on macOS the
# Linux-layout path never exists, so it always fell through to .bin/electron —
# a symlink to the package's cli.js that passes -x even with no binary — and a
# broken install launched anyway, hanging forever on "Downloading Electron
# binary...". Catch it here and say how to fix it instead.
ELECTRON="$(node -p "require('electron')" 2>/dev/null)" || ELECTRON=""
if [ -z "$ELECTRON" ] || [ ! -x "$ELECTRON" ]; then
  echo "gitty: Electron's binary is missing — its download never completed." >&2
  echo "gitty: reinstall it with:" >&2
  echo "         node \"$HERE/node_modules/electron/install.js\"" >&2
  echo "gitty: on a mirror-only network, point it at a mirror first, e.g.:" >&2
  echo "         ELECTRON_MIRROR=https://registry.npmmirror.com/-/binary/electron/ \\" >&2
  echo "           node \"$HERE/node_modules/electron/install.js\"" >&2
  exit 1
fi

# Everything from here uses absolute paths: a --any launch with no repository
# changes directory below so the app opens from outside any work tree and its
# recent-repositories fallback kicks in.
MAIN="$HERE/out/main/index.js"
if [ "$ANY" -eq 1 ] && [ -z "$REPO" ]; then
  cd "$HOME"
fi

if [ "$FOREGROUND" -eq 1 ]; then
  exec "$ELECTRON" "$MAIN" ${REPO:+"$REPO"}
fi

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/gitty"
LOG="$LOG_DIR/gitty.log"
mkdir -p "$LOG_DIR"

# Keep the log from growing without bound: past 4 MB, keep only the tail.
if [ -f "$LOG" ] && [ "$(wc -c <"$LOG")" -gt 4194304 ]; then
  tail -c 1048576 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

{
  echo
  echo "=== $(date '+%Y-%m-%d %H:%M:%S')  $REPO"
} >>"$LOG"

# Detach: the window outlives the terminal that started it.
nohup "$ELECTRON" "$MAIN" ${REPO:+"$REPO"} >>"$LOG" 2>&1 &
PID=$!
disown "$PID" 2>/dev/null || true

echo "gitty: ${REPO:-no repository} (pid $PID)"
echo "gitty: log $LOG"
