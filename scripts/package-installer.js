const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const installerName = 'Absolute protagonist Setup.exe';

function main() {
  cleanOutput();

  const result = spawnSync(
    process.execPath,
    [
      path.join(rootDir, 'node_modules', 'electron-builder', 'cli.js'),
      '--win',
      'nsis',
      '--x64',
      '--config',
      'electron-builder.json'
    ],
    {
      cwd: rootDir,
      stdio: 'inherit',
      windowsHide: true
    }
  );

  if (result.status !== 0) {
    throw new Error('Failed to build exe installer.');
  }

  const installerPath = path.join(distDir, installerName);
  if (!fs.existsSync(installerPath)) {
    throw new Error(`Installer was not created: ${installerPath}`);
  }

  removeIfExists(path.join(distDir, 'win-unpacked'));
  removeMatchingDistFiles((name) => name.endsWith('.blockmap') || name.endsWith('.yml'));

  console.log(`Packaged installer: ${installerPath}`);
}

function cleanOutput() {
  fs.mkdirSync(distDir, { recursive: true });

  removeIfExists(path.join(distDir, 'Absolute protagonist'));
  removeIfExists(path.join(distDir, 'win-unpacked'));
  removeIfExists(path.join(distDir, '.installer-build'));
  removeIfExists(path.join(distDir, '.launcher-build'));

  for (const file of [
    installerName,
    'Absolute protagonist-windows.zip',
    'Absolute protagonist-0.1.0.msi',
    '维什戴尔桌面宠物-windows.zip'
  ]) {
    removeIfExists(path.join(distDir, file));
  }

  removeMatchingDistFiles((name) => name.endsWith('.blockmap') || name.endsWith('.yml'));
}

function removeMatchingDistFiles(predicate) {
  for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
    if (entry.isFile() && predicate(entry.name)) {
      removeIfExists(path.join(distDir, entry.name));
    }
  }
}

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

main();
