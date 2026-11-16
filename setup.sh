#!/usr/bin/env bash
#
# Install Gitty as a global `gitty` command.
#
#   ./setup.sh               install to ~/.local/bin (no sudo needed)
#   ./setup.sh --system      install to /usr/local/bin (requires sudo)
#
# On Windows, run it from Git Bash: it writes `gitty` for Git Bash and
# `gitty.cmd` for cmd and PowerShell into ~/.local/bin, plus a Start Menu and
# desktop shortcut.
#
# After installing, run `gitty .` (or just `gitty`) from any repository.
#
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
LAUNCHER="$HERE/run.sh"

# Install a desktop entry so Gitty appears in the application menu (and on the
# desktop, when one exists) with its icon. It launches with --any so it can
# start from outside a work tree and fall back to the last repositories opened.
# Everything goes under ~/.local/share — even with --system, since a desktop
# shortcut is a per-user thing and needs no sudo.
install_desktop_entry() {
  local data="${XDG_DATA_HOME:-$HOME/.local/share}"
  local apps_dir="$data/applications"
  local icon_dir="$data/icons/hicolor/512x512/apps"
  local icon="$HERE/build/icon.png"

  if [ ! -f "$icon" ]; then
    echo "setup: no icon at $icon; skipping desktop entry" >&2
    return 0
  fi

  mkdir -p "$apps_dir" "$icon_dir"
  cp "$icon" "$icon_dir/gitty.png"

  # The launcher path may hold spaces; the desktop spec quotes Exec arguments.
  local launcher
  launcher="$(readlink -f "$LAUNCHER")"
  # StartupWMClass is what ties a running window back to this entry, and so to
  # this icon, in the window list and the dock. It has to say "electron":
  # an Electron app that is run rather than packaged reports that as its
  # WM_CLASS (its Wayland app_id) no matter what — app.setName, --class,
  # --name, --wm-class-class, CHROME_DESKTOP and renaming the binary all leave
  # it alone. The cost is that another unpackaged Electron app would borrow
  # Gitty's icon; packaging Gitty into its own executable is the only real fix.
  cat > "$apps_dir/gitty.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Gitty
Comment=Git history browser
Exec="$launcher" --any
Icon=gitty
StartupWMClass=electron
Terminal=false
Categories=Development;
EOF
  chmod +x "$apps_dir/gitty.desktop"

  # A copy on the desktop itself, when the session has one; harmless to skip.
  local desktop
  desktop="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
  if [ -n "$desktop" ] && [ -d "$desktop" ]; then
    cp "$apps_dir/gitty.desktop" "$desktop/gitty.desktop"
    chmod +x "$desktop/gitty.desktop"
  fi

  # Without a refreshed cache the entry shows up with a blank icon until the
  # session is restarted: GTK trusts the theme's cache over the directory.
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$data/icons/hicolor" >/dev/null 2>&1 || true
  fi

  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$apps_dir" >/dev/null 2>&1 || true
  fi

  echo "desktop entry → $apps_dir/gitty.desktop"
}

# macOS has no .desktop files. The equivalent is a bundle, so wrap run.sh in a
# minimal one: Finder and the Dock read Contents/Info.plist for the name and the
# icon, and Contents/MacOS/Gitty is just a script that execs the launcher.
#
# Nothing here packages the app. The menu-bar name is already right without it —
# `app.setName('Gitty')` runs before any window exists and the application menu
# is `{ role: 'appMenu' }`, which Electron labels with `app.name` — so the bundle
# only has to supply the Dock tile and the icon, which it does by existing.
install_macos_app() {
  local apps_dir="$HOME/Applications"
  local app="$apps_dir/Gitty.app"
  local icon="$HERE/build/icon.png"
  local launcher
  launcher="$(readlink -f "$LAUNCHER")"

  mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"

  # A double-clicked bundle inherits launchd's minimal PATH — no nvm, no
  # Homebrew — and run.sh needs node and npm to build when the bundle is stale.
  # Resolve them now and prepend: a prefix leaves a terminal launch untouched,
  # and going stale (a new nvm version) is repaired by re-running setup.sh,
  # which is easier to reason about than a wrapper sourcing a shell profile.
  local bin_dirs="" tool dir
  for tool in node npm git; do
    dir="$(command -v "$tool" 2>/dev/null || true)"
    [ -n "$dir" ] || continue
    dir="$(dirname "$dir")"
    case ":$bin_dirs:" in *":$dir:"*) ;; *) bin_dirs="${bin_dirs:+$bin_dirs:}$dir" ;; esac
  done

  # --fg so the bundle's process is replaced by Electron rather than outliving
  # it: exec all the way down is what keeps the Dock tile on this bundle.
  # --any so a launch from Finder, which has no working directory to speak of,
  # falls back to the repositories opened most recently.
  cat > "$app/Contents/MacOS/Gitty" <<EOF
#!/bin/sh
export PATH="$bin_dirs:\$PATH"
exec "$launcher" --fg --any
EOF
  chmod +x "$app/Contents/MacOS/Gitty"

  local version
  version="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$HERE/package.json" | head -1)"
  cat > "$app/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>              <string>Gitty</string>
  <key>CFBundleDisplayName</key>       <string>Gitty</string>
  <key>CFBundleIdentifier</key>        <string>io.github.baojie.gitty</string>
  <key>CFBundleExecutable</key>        <string>Gitty</string>
  <key>CFBundleIconFile</key>          <string>gitty</string>
  <key>CFBundlePackageType</key>       <string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${version:-0}</string>
  <key>NSHighResolutionCapable</key>   <true/>
</dict>
</plist>
EOF

  if [ ! -f "$icon" ]; then
    echo "setup: no icon at $icon; the bundle will use the generic one" >&2
  elif command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
    local iconset
    iconset="$(mktemp -d)/gitty.iconset"
    mkdir -p "$iconset"
    # iconutil matches these names exactly; a missing size is fine, a misnamed
    # one makes it refuse the whole set.
    local s
    for s in 16 32 128 256 512; do
      sips -z "$s" "$s" "$icon" --out "$iconset/icon_${s}x${s}.png" >/dev/null 2>&1 || true
      sips -z "$((s * 2))" "$((s * 2))" "$icon" \
        --out "$iconset/icon_${s}x${s}@2x.png" >/dev/null 2>&1 || true
    done
    iconutil -c icns "$iconset" -o "$app/Contents/Resources/gitty.icns" 2>/dev/null ||
      echo "setup: could not build gitty.icns; the bundle will use the generic icon" >&2
    rm -rf "$(dirname "$iconset")"
  else
    echo "setup: sips/iconutil not found; the bundle will use the generic icon" >&2
  fi

  # Tell Launch Services the bundle is there, so it is findable without a
  # relaunch of Finder. This registers it; it does not place it anywhere.
  local lsregister="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
  [ -x "$lsregister" ] && "$lsregister" -f "$app" >/dev/null 2>&1 || true

  # A symlink on the desktop, mirroring the Linux branch's copy there. The Dock
  # is deliberately left alone — pinning is the user's call, as it is on Linux.
  if [ -d "$HOME/Desktop" ]; then
    ln -sfn "$app" "$HOME/Desktop/Gitty.app" 2>/dev/null || true
  fi

  echo "app bundle → $app"
  [ -n "$bin_dirs" ] && echo "  PATH pinned to: $bin_dirs"
  echo "  drag it to the Dock to pin it"
}

# Git Bash (MSYS2) reports MINGW64_NT-…; Cygwin and a bare MSYS shell are the
# same environment for everything below.
is_windows() {
  case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 0 ;; *) return 1 ;; esac
}

# The `gitty` command on Windows is a pair of wrappers, not a symlink: Git
# Bash's `ln -s` silently makes a copy unless Developer Mode and
# MSYS=winsymlinks are both on, and a copy of run.sh would look for the
# checkout beside itself. One wrapper serves Git Bash; the .cmd serves cmd and
# PowerShell by handing the arguments to Git's bash.
install_windows_commands() {
  local bash_w launcher_m
  bash_w="$(cygpath -w "$(command -v bash)")"
  launcher_m="$(cygpath -m "$LAUNCHER")"

  cat > "$TARGET_DIR/gitty" <<EOF
#!/usr/bin/env bash
exec "$LAUNCHER" "\$@"
EOF
  chmod +x "$TARGET_DIR/gitty"

  # -l puts Git's /usr/bin (readlink, find, nohup) on PATH, which bash started
  # from cmd would otherwise lack; CHERE_INVOKING stops the login profile from
  # changing to $HOME, so `gitty` still means the current directory.
  printf '@echo off\r\nsetlocal\r\nset CHERE_INVOKING=1\r\n"%s" -l "%s" %%*\r\n' \
    "$bash_w" "$launcher_m" > "$TARGET_DIR/gitty.cmd"
}

# The Windows counterpart of the desktop entry: a shortcut in the Start Menu
# and on the desktop that runs `run.sh --any` through Git's bash in a minimised
# window. run.sh detaches Electron and exits, so that window lasts a moment.
# A .lnk takes its icon from an .ico, so the PNG is wrapped in one — a single
# 256px PNG entry, which every Windows since Vista reads.
install_windows_shortcuts() {
  local data="${LOCALAPPDATA:-$HOME/AppData/Local}/Gitty"
  mkdir -p "$data"

  GITTY_BASH="$(cygpath -w "$(command -v bash)")" \
  GITTY_ARGS="-l \"$(cygpath -m "$LAUNCHER")\" --any" \
  GITTY_PNG="$(cygpath -w "$HERE/build/icon.png")" \
  GITTY_ICO="$(cygpath -w "$data/gitty.ico")" \
  powershell.exe -NoProfile -NonInteractive -Command '
    $ErrorActionPreference = "Stop"
    Add-Type -AssemblyName System.Drawing
    $icon = $null
    if (Test-Path $env:GITTY_PNG) {
      $src = [Drawing.Image]::FromFile($env:GITTY_PNG)
      $bmp = New-Object Drawing.Bitmap $src, 256, 256
      $png = New-Object IO.MemoryStream
      $bmp.Save($png, [Drawing.Imaging.ImageFormat]::Png)
      $bytes = $png.ToArray()
      $out = New-Object IO.BinaryWriter ([IO.File]::Create($env:GITTY_ICO))
      # ICONDIR, then one ICONDIRENTRY: 0 x 0 means 256 x 256.
      $out.Write([UInt16]0); $out.Write([UInt16]1); $out.Write([UInt16]1)
      $out.Write([Byte]0); $out.Write([Byte]0); $out.Write([Byte]0); $out.Write([Byte]0)
      $out.Write([UInt16]1); $out.Write([UInt16]32)
      $out.Write([UInt32]$bytes.Length); $out.Write([UInt32]22)
      $out.Write($bytes); $out.Close(); $src.Dispose(); $bmp.Dispose()
      $icon = $env:GITTY_ICO
    }
    $shell = New-Object -ComObject WScript.Shell
    foreach ($dir in [Environment]::GetFolderPath("Programs"), [Environment]::GetFolderPath("Desktop")) {
      if (-not $dir -or -not (Test-Path $dir)) { continue }
      $lnk = $shell.CreateShortcut((Join-Path $dir "Gitty.lnk"))
      $lnk.TargetPath = $env:GITTY_BASH
      $lnk.Arguments = $env:GITTY_ARGS
      $lnk.WorkingDirectory = $env:USERPROFILE
      $lnk.WindowStyle = 7
      $lnk.Description = "Git history browser"
      if ($icon) { $lnk.IconLocation = "$icon,0" }
      $lnk.Save()
      Write-Output "shortcut -> $(Join-Path $dir "Gitty.lnk")"
    }
  ' || echo "setup: could not create the Windows shortcuts" >&2
}

if [ "${1:-}" = "--system" ]; then
  if is_windows; then
    echo "setup: --system is not supported on Windows; run ./setup.sh" >&2
    exit 1
  fi
  TARGET_DIR="/usr/local/bin"
else
  TARGET_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"
fi

if [ ! -f "$LAUNCHER" ]; then
  echo "setup: launcher not found: $LAUNCHER" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
if is_windows; then
  install_windows_commands
else
  ln -sfn "$LAUNCHER" "$TARGET_DIR/gitty"
fi

echo "gitty installed → $TARGET_DIR/gitty"
echo "  run:  gitty .          # open the current repository"
echo "  run:  gitty --dev .    # dev mode with hot reload"

# Pick the shortcut by platform, the way the launcher itself is one script for
# both: a .desktop entry means nothing to Finder, and a bundle means nothing to
# a Linux session.
case "$(uname -s)" in
  Darwin) install_macos_app ;;
  MINGW*|MSYS*|CYGWIN*) install_windows_shortcuts ;;
  *) install_desktop_entry ;;
esac

# Warn if the target isn't on PATH.
case ":$PATH:" in
  *":$TARGET_DIR:"*) : ;;
  *) echo
     echo "warning: $TARGET_DIR is not on your PATH."
     if is_windows; then
       # Git Bash builds its PATH from Windows', so one entry serves every shell.
       echo "add it (then open a new terminal) with, in PowerShell:"
       echo "  [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';$(cygpath -w "$TARGET_DIR")', 'User')"
     else
       echo "add it with:  export PATH=\"$TARGET_DIR:\$PATH\""
     fi ;;
esac
