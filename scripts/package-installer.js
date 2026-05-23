const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const tauriDir = path.join(rootDir, 'src-tauri');
const distDir = path.join(rootDir, 'dist');
const bundleDir = path.join(tauriDir, 'target', 'release', 'bundle', 'nsis');
const packageWorkDir = path.join(tauriDir, 'target', 'package-installer');
const packageResourcesDir = path.join(packageWorkDir, 'resources');
const packageConfigPath = path.join(packageWorkDir, 'tauri.package.conf.json');
const tauriConfigPath = path.join(tauriDir, 'tauri.conf.json');
const installerName = 'Absolute protagonist Setup.exe';
const isDryRun = process.argv.includes('--dry-run') || process.env.PACKAGE_DRY_RUN === '1';

const runtimeAssetExtensions = new Set([
  '',
  '.webm',
  '.skel',
  '.atlas',
  '.png',
  '.json'
]);
const iconExtensions = new Set(['.ico', '.png']);
const ignoredFileNames = new Set(['thumbs.db', '.ds_store']);

const resourceFolders = [
  {
    label: 'webm-assets',
    source: path.join(rootDir, 'webm-assets'),
    target: 'webm-assets',
    required: true,
    includeFile: shouldIncludeRuntimeAssetFile
  },
  {
    label: 'spine-assets',
    source: path.join(rootDir, 'spine-assets'),
    target: 'spine-assets',
    required: false,
    includeFile: shouldIncludeRuntimeAssetFile
  },
  {
    label: 'icon',
    source: path.join(rootDir, 'icon'),
    target: 'icon',
    required: true,
    includeFile: shouldIncludeIconFile
  }
];

function main() {
  try {
    cleanupPackageWorkDir();
    if (!isDryRun) {
      fs.rmSync(distDir, { recursive: true, force: true });
      fs.rmSync(bundleDir, { recursive: true, force: true });
      fs.mkdirSync(distDir, { recursive: true });
      fs.mkdirSync(packageWorkDir, { recursive: true });
    }

    const stagedResources = stageResources({ copyFiles: !isDryRun });

    if (isDryRun) {
      printPackagingSummary(stagedResources);
      console.log('Dry run only. No installer was built.');
      return;
    }

    writePackageConfig(stagedResources.resourceMap);

    const env = { ...process.env };
    const cargoBinDir = path.join(env.USERPROFILE || '', '.cargo', 'bin');
    if (cargoBinDir) {
      env.PATH = `${cargoBinDir}${path.delimiter}${env.PATH || ''}`;
    }
    applySmallReleaseProfile(env);

    const tauriCli = path.join(rootDir, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
    const result = spawnSync(process.execPath, [
      tauriCli,
      'build',
      '--bundles',
      'nsis',
      '--config',
      packageConfigPath
    ], {
      cwd: rootDir,
      env,
      stdio: 'inherit',
      windowsHide: true
    });

    if (result.status !== 0) {
      throw result.error || new Error('Failed to build Tauri exe installer.');
    }

    const sourceInstaller = findLatestInstaller();
    const outputInstaller = path.join(distDir, installerName);
    fs.copyFileSync(sourceInstaller, outputInstaller);

    const installerSize = fs.statSync(outputInstaller).size;
    printPackagingSummary(stagedResources, installerSize);
    console.log(`Packaged installer: ${outputInstaller}`);
  } finally {
    cleanupPackageWorkDir();
  }
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

function stageResources({ copyFiles } = { copyFiles: true }) {
  const resourceMap = {};
  const folderSummaries = [];
  const totals = createStats();

  for (const folder of resourceFolders) {
    if (!fs.existsSync(folder.source)) {
      if (folder.required) {
        throw new Error(`Required resource folder was not found: ${folder.source}`);
      }

      continue;
    }

    const targetDir = path.join(packageResourcesDir, folder.target);
    const stats = copyFilteredDirectory(folder.source, targetDir, folder.includeFile, {
      copyFiles
    });

    if (folder.required && stats.files === 0) {
      throw new Error(`Required resource folder has no packageable files: ${folder.source}`);
    }

    if (stats.files > 0) {
      resourceMap[targetDir] = folder.target;
      folderSummaries.push({
        label: folder.label,
        target: folder.target,
        ...stats
      });
      addStats(totals, stats);
    }
  }

  if (Object.keys(resourceMap).length === 0) {
    throw new Error('No resources were staged for packaging.');
  }

  return {
    resourceMap,
    folderSummaries,
    totals
  };
}

function copyFilteredDirectory(sourceDir, targetDir, includeFile, options = {}) {
  const stats = createStats();
  copyFilteredDirectoryInner(sourceDir, targetDir, includeFile, stats, {
    copyFiles: options.copyFiles !== false
  });
  return stats;
}

function copyFilteredDirectoryInner(sourceDir, targetDir, includeFile, stats, options) {
  const entries = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .sort((a, b) => compareFileNames(a.name, b.name));

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isSymbolicLink()) {
      stats.skippedFiles += 1;
      continue;
    }

    if (entry.isDirectory()) {
      const beforeFiles = stats.files;
      copyFilteredDirectoryInner(sourcePath, targetPath, includeFile, stats, options);
      if (stats.files > beforeFiles) {
        stats.directories += 1;
      }
      continue;
    }

    if (!entry.isFile()) {
      stats.skippedFiles += 1;
      continue;
    }

    if (!includeFile(sourcePath)) {
      stats.skippedFiles += 1;
      continue;
    }

    if (options.copyFiles) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }

    const fileSize = fs.statSync(sourcePath).size;
    stats.files += 1;
    stats.bytes += fileSize;
  }
}

function shouldIncludeRuntimeAssetFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return false;
  }

  return runtimeAssetExtensions.has(path.extname(filePath).toLowerCase());
}

function shouldIncludeIconFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return false;
  }

  return iconExtensions.has(path.extname(filePath).toLowerCase());
}

function shouldIgnoreFile(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  return ignoredFileNames.has(fileName) || fileName.endsWith('.log');
}

function writePackageConfig(resourceMap) {
  const baseConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
  const resourcesPatch = {};
  const baseResources = baseConfig?.bundle?.resources;

  if (
    baseResources &&
    typeof baseResources === 'object' &&
    !Array.isArray(baseResources)
  ) {
    for (const source of Object.keys(baseResources)) {
      resourcesPatch[source] = null;
    }
  }

  for (const [source, target] of Object.entries(resourceMap)) {
    resourcesPatch[source] = target;
  }

  const packageConfig = {
    bundle: {
      resources: resourcesPatch,
      windows: {
        nsis: {
          compression: 'lzma'
        }
      }
    }
  };

  fs.writeFileSync(packageConfigPath, `${JSON.stringify(packageConfig, null, 2)}\n`);
}

function applySmallReleaseProfile(env) {
  env.CARGO_PROFILE_RELEASE_OPT_LEVEL = 'z';
  env.CARGO_PROFILE_RELEASE_LTO = 'fat';
  env.CARGO_PROFILE_RELEASE_CODEGEN_UNITS = '1';
  env.CARGO_PROFILE_RELEASE_STRIP = 'symbols';
  env.CARGO_PROFILE_RELEASE_PANIC = 'abort';
  env.CARGO_PROFILE_RELEASE_INCREMENTAL = 'false';
  env.CARGO_PROFILE_RELEASE_DEBUG = '0';
}

function printPackagingSummary(stagedResources, installerSize) {
  console.log('Packaging resources:');
  for (const folder of stagedResources.folderSummaries) {
    const skipped = folder.skippedFiles > 0 ? `, skipped ${folder.skippedFiles}` : '';
    console.log(
      `  - ${folder.label}: ${folder.files} files, ${formatBytes(folder.bytes)}${skipped}`
    );
  }
  console.log(`  Total staged: ${stagedResources.totals.files} files, ${formatBytes(stagedResources.totals.bytes)}`);
  if (typeof installerSize === 'number') {
    console.log(`  Installer size: ${formatBytes(installerSize)}`);
  }
}

function cleanupPackageWorkDir() {
  fs.rmSync(packageWorkDir, { recursive: true, force: true });
}

function compareFileNames(left, right) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft < normalizedRight) {
    return -1;
  }
  if (normalizedLeft > normalizedRight) {
    return 1;
  }
  return 0;
}

function createStats() {
  return {
    files: 0,
    directories: 0,
    bytes: 0,
    skippedFiles: 0
  };
}

function addStats(target, source) {
  target.files += source.files;
  target.directories += source.directories;
  target.bytes += source.bytes;
  target.skippedFiles += source.skippedFiles;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

main();
