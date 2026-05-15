const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const distDir = path.join(rootDir, 'dist');
const packageDir = path.join(distDir, 'win-unpacked');
const resourcesDir = path.join(packageDir, 'resources');
const appDir = path.join(resourcesDir, 'app');
const exeName = '维什戴尔桌面宠物.exe';

function ensureElectronRuntime() {
  const electronExe = path.join(electronDistDir, 'electron.exe');
  if (!fs.existsSync(electronExe)) {
    throw new Error('Cannot find Electron runtime. Run npm install first.');
  }
}

function cleanOutput() {
  fs.rmSync(packageDir, { recursive: true, force: true });
  fs.mkdirSync(appDir, { recursive: true });
}

function copyElectronRuntime() {
  fs.cpSync(electronDistDir, packageDir, {
    recursive: true,
    filter: (source) => !source.endsWith(path.join('resources', 'default_app.asar'))
  });

  const electronExe = path.join(packageDir, 'electron.exe');
  const appExe = path.join(packageDir, exeName);
  if (fs.existsSync(appExe)) fs.rmSync(appExe);
  fs.renameSync(electronExe, appExe);
}

function copyAppFiles() {
  fs.cpSync(path.join(rootDir, 'src'), path.join(appDir, 'src'), { recursive: true });
  fs.cpSync(path.join(rootDir, 'assets'), path.join(appDir, 'assets'), { recursive: true });

  for (const file of ['README.md', 'LICENSE']) {
    const source = path.join(rootDir, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(appDir, file));
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const packagedPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: packageJson.main,
    private: true
  };

  fs.writeFileSync(
    path.join(appDir, 'package.json'),
    `${JSON.stringify(packagedPackageJson, null, 2)}\n`,
    'utf8'
  );
}

function main() {
  ensureElectronRuntime();
  cleanOutput();
  copyElectronRuntime();
  copyAppFiles();

  console.log(`Packaged Windows app: ${path.join(packageDir, exeName)}`);
}

main();
