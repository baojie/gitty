// npm postinstall, second half (the first is install-electron): rebuild
// node-pty against Electron's ABI — except where that rebuild cannot help.
//
// On Windows node-pty ships N-API prebuilds (prebuilds/win32-<arch>/), which
// load under any Electron without recompiling, while a rebuild needs Visual
// Studio's C++ tools — which most Windows machines lack, so forcing it fails
// the whole install for nothing. macOS also has prebuilds but keeps the
// rebuild: node-pty 1.1's prebuilt spawn-helper can arrive without its exec
// bit, and the rebuild is the path known to work there. Linux has no prebuilds.
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

function hasPrebuild() {
  try {
    const dir = path.dirname(require.resolve('node-pty/package.json'))
    const prebuild = path.join(dir, 'prebuilds', `${process.platform}-${process.arch}`, 'pty.node')
    return fs.existsSync(prebuild)
  } catch {
    return false
  }
}

if (process.platform === 'win32' && hasPrebuild()) {
  console.log('gitty: using node-pty prebuilds for win32; skipping electron-rebuild')
} else {
  execSync('electron-rebuild -f -w node-pty', { stdio: 'inherit' })
}
