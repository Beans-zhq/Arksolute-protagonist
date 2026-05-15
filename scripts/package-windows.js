const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const distDir = path.join(rootDir, 'dist');
const packageDir = path.join(distDir, 'Absolute protagonist');
const dataDir = path.join(packageDir, 'data');
const appDir = path.join(dataDir, 'app');
const runtimeDir = path.join(dataDir, 'runtime');
const assetsDir = path.join(packageDir, 'assets');
const launcherBuildDir = path.join(distDir, '.launcher-build');
const exeName = 'Absolute protagonist.exe';
const runtimeExeName = 'Absolute protagonist Runtime.exe';
const keptLocaleFiles = new Set(['en-US.pak', 'zh-CN.pak', 'zh-TW.pak']);
const prunedRuntimeFiles = [
  'LICENSES.chromium.html',
  'd3dcompiler_47.dll',
  'debug.log',
  'snapshot_blob.bin',
  'vk_swiftshader.dll',
  'vk_swiftshader_icd.json',
  'vulkan-1.dll'
];

function ensureElectronRuntime() {
  const electronExe = path.join(electronDistDir, 'electron.exe');
  if (!fs.existsSync(electronExe)) {
    throw new Error('Cannot find Electron runtime. Run npm install first.');
  }
}

function cleanOutput() {
  fs.rmSync(packageDir, { recursive: true, force: true });
  fs.rmSync(path.join(distDir, 'win-unpacked'), { recursive: true, force: true });
  fs.rmSync(path.join(distDir, '维什戴尔桌面宠物-windows.zip'), { force: true });
  fs.rmSync(path.join(distDir, 'Absolute protagonist-windows.zip'), { force: true });
  fs.rmSync(launcherBuildDir, { recursive: true, force: true });
  fs.mkdirSync(appDir, { recursive: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
}

function copyElectronRuntime() {
  fs.cpSync(electronDistDir, runtimeDir, {
    recursive: true
  });

  const electronExe = path.join(runtimeDir, 'electron.exe');
  const runtimeExe = path.join(runtimeDir, runtimeExeName);
  if (fs.existsSync(runtimeExe)) fs.rmSync(runtimeExe);
  fs.renameSync(electronExe, runtimeExe);

  pruneElectronRuntime();
}

function pruneElectronRuntime() {
  // Keep resources/default_app.asar: this package launches Electron with
  // data/app as an argument, and Electron uses the default app to load it.
  pruneLocales();
  pruneRuntimeFiles();
}

function pruneLocales() {
  const localesDir = path.join(runtimeDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  for (const entry of fs.readdirSync(localesDir, { withFileTypes: true })) {
    if (!entry.isFile() || keptLocaleFiles.has(entry.name)) continue;
    fs.rmSync(path.join(localesDir, entry.name), { force: true });
  }
}

function pruneRuntimeFiles() {
  for (const file of prunedRuntimeFiles) {
    fs.rmSync(path.join(runtimeDir, file), { force: true });
  }
}

function copyAppFiles() {
  fs.cpSync(path.join(rootDir, 'src'), path.join(appDir, 'src'), { recursive: true });
  fs.cpSync(path.join(rootDir, 'assets'), assetsDir, { recursive: true });

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

function buildLauncher() {
  const sourceDir = path.join(launcherBuildDir, 'src');
  const outputDir = path.join(launcherBuildDir, 'output');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const sourceFile = path.join(sourceDir, 'Program.cs');
  const launcherExe = path.join(outputDir, exeName);
  fs.writeFileSync(sourceFile, getLauncherSource(), 'utf8');

  const cscPath = getCscPath();
  const result = spawnSync(cscPath, ['/nologo', '/target:winexe', `/out:${launcherExe}`, sourceFile], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Failed to build Windows launcher.');
  }

  if (!fs.existsSync(launcherExe)) {
    throw new Error('Launcher build succeeded but exe was not found.');
  }

  fs.copyFileSync(launcherExe, path.join(packageDir, exeName));
}

function getCscPath() {
  const candidates = [
    path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error('Cannot find csc.exe. Install .NET Framework build tools or adjust package script.');
}

function getLauncherSource() {
  return `using System;
using System.Diagnostics;
using System.IO;

namespace AbsoluteProtagonistLauncher
{
    internal static class Program
    {
        private static int Main()
        {
            string root = AppDomain.CurrentDomain.BaseDirectory;
            string runtimeExe = Path.Combine(root, "data", "runtime", "${runtimeExeName}");
            string appPath = Path.Combine(root, "data", "app");

            if (!File.Exists(runtimeExe))
            {
                return 2;
            }

            if (!Directory.Exists(appPath))
            {
                return 3;
            }

            ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.FileName = runtimeExe;
            startInfo.WorkingDirectory = root;
            startInfo.UseShellExecute = false;
            startInfo.Arguments = "\\\"" + appPath + "\\\"";

            Process.Start(startInfo);
            return 0;
        }
    }
}
`;
}

function main() {
  ensureElectronRuntime();
  cleanOutput();
  copyElectronRuntime();
  copyAppFiles();
  buildLauncher();

  console.log(`Packaged Windows app: ${path.join(packageDir, exeName)}`);
}

main();
