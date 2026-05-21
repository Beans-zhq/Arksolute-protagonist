const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const bundleDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const installerName = 'Absolute protagonist Setup.exe';

function main() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const env = { ...process.env };
  const cargoBinDir = path.join(env.USERPROFILE || '', '.cargo', 'bin');
  if (cargoBinDir) {
    env.PATH = `${cargoBinDir}${path.delimiter}${env.PATH || ''}`;
  }

  const tauriCli = path.join(rootDir, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
  const result = spawnSync(process.execPath, [tauriCli, 'build', '--bundles', 'nsis'], {
    cwd: rootDir,
    env,
    stdio: 'inherit',
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error('Failed to build Tauri exe installer.');
  }

  const sourceInstaller = findLatestInstaller();
  const outputInstaller = path.join(distDir, installerName);
  fs.copyFileSync(sourceInstaller, outputInstaller);

  console.log(`Packaged installer: ${outputInstaller}`);
}

function findLatestInstaller() {
  const installers = fs
    .readdirSync(bundleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.exe'))
    .map((entry) => {
      const filePath = path.join(bundleDir, entry.name);
      return {
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (installers.length === 0) {
    throw new Error(`Installer was not created in ${bundleDir}.`);
  }

  return installers[0].filePath;
}

main();
