const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageDir = path.join(distDir, 'Absolute protagonist');
const msiBuildDir = path.join(distDir, '.msi-build');
const cacheDir = path.join(rootDir, '.cache');
const wixCacheDir = path.join(cacheDir, 'wix-toolset');
const wixBinDir = path.join(wixCacheDir, 'wix314');
const wixZipPath = path.join(wixCacheDir, 'wix314-binaries.zip');
const wixDownloadUrl = 'https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip';
const appName = 'Absolute protagonist';
const exeName = 'Absolute protagonist.exe';
const manufacturer = 'Absolute protagonist';
const upgradeCode = 'B3D90956-521C-4942-963C-18E29559063A';

async function main() {
  fs.mkdirSync(distDir, { recursive: true });
  fs.rmSync(msiBuildDir, { recursive: true, force: true });
  fs.mkdirSync(msiBuildDir, { recursive: true });

  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = normalizeMsiVersion(packageJson.version);
  const outputMsi = path.join(distDir, `${appName}-${version}.msi`);

  run(process.execPath, [path.join(__dirname, 'package-windows.js')], 'Failed to build Windows app package.');
  await ensureWixToolset();

  const productWxs = path.join(msiBuildDir, 'Product.wxs');
  const harvestWxs = path.join(msiBuildDir, 'Harvest.wxs');
  fs.writeFileSync(productWxs, getProductWxs(version, packageJson.description || appName), 'utf8');

  run(
    wixTool('heat.exe'),
    [
      'dir',
      packageDir,
      '-cg',
      'AppFiles',
      '-dr',
      'INSTALLFOLDER',
      '-gg',
      '-scom',
      '-sreg',
      '-srd',
      '-var',
      'var.SourceDir',
      '-out',
      harvestWxs
    ],
    'Failed to harvest packaged app files.'
  );

  run(
    wixTool('candle.exe'),
    [
      '-nologo',
      '-arch',
      'x64',
      `-dSourceDir=${packageDir}`,
      '-out',
      `${msiBuildDir}${path.sep}`,
      productWxs,
      harvestWxs
    ],
    'Failed to compile MSI sources.'
  );

  fs.rmSync(outputMsi, { force: true });
  run(
    wixTool('light.exe'),
    [
      '-nologo',
      '-spdb',
      '-sice:ICE38',
      '-sice:ICE64',
      '-sice:ICE91',
      '-out',
      outputMsi,
      path.join(msiBuildDir, 'Product.wixobj'),
      path.join(msiBuildDir, 'Harvest.wixobj')
    ],
    'Failed to link MSI package.'
  );

  fs.rmSync(msiBuildDir, { recursive: true, force: true });

  console.log(`Packaged MSI: ${outputMsi}`);
}

function normalizeMsiVersion(version) {
  const parts = String(version || '0.1.0')
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isInteger(part) && part >= 0);

  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3).join('.');
}

async function ensureWixToolset() {
  if (fs.existsSync(wixTool('candle.exe')) && fs.existsSync(wixTool('light.exe')) && fs.existsSync(wixTool('heat.exe'))) {
    return;
  }

  fs.mkdirSync(wixCacheDir, { recursive: true });

  if (!fs.existsSync(wixZipPath)) {
    downloadFile(wixDownloadUrl, wixZipPath);
  }

  fs.rmSync(wixBinDir, { recursive: true, force: true });
  fs.mkdirSync(wixBinDir, { recursive: true });

  run(
    getPowerShellPath(),
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Expand-Archive -LiteralPath '${escapePowerShellSingleQuoted(wixZipPath)}' -DestinationPath '${escapePowerShellSingleQuoted(wixBinDir)}' -Force`
    ],
    'Failed to extract WiX Toolset binaries.'
  );

  for (const tool of ['candle.exe', 'light.exe', 'heat.exe']) {
    if (!fs.existsSync(wixTool(tool))) {
      throw new Error(`WiX Toolset extraction did not produce ${tool}.`);
    }
  }
}

function wixTool(name) {
  return path.join(wixBinDir, name);
}

function downloadFile(url, destination) {
  fs.rmSync(`${destination}.tmp`, { force: true });

  run(
    getPowerShellPath(),
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      [
        '$ProgressPreference = "SilentlyContinue"',
        `Invoke-WebRequest -Uri '${escapePowerShellSingleQuoted(url)}' -OutFile '${escapePowerShellSingleQuoted(destination)}'`
      ].join('; ')
    ],
    'Failed to download WiX Toolset binaries.'
  );
}

function getPowerShellPath() {
  const candidates = [
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    'powershell.exe'
  ];

  for (const candidate of candidates) {
    if (candidate === 'powershell.exe' || fs.existsSync(candidate)) return candidate;
  }

  return 'powershell.exe';
}

function getProductWxs(version, description) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" Name="${xml(appName)}" Language="2052" Codepage="65001" Version="${xml(version)}" Manufacturer="${xml(manufacturer)}" UpgradeCode="${upgradeCode}">
    <Package InstallerVersion="500" Compressed="yes" InstallScope="perUser" InstallPrivileges="limited" Description="${xml(description)}" />
    <MajorUpgrade AllowSameVersionUpgrades="yes" DowngradeErrorMessage="A newer version of ${xml(appName)} is already installed." />
    <MediaTemplate EmbedCab="yes" CompressionLevel="high" />
    <Property Id="ARPNOREPAIR" Value="1" />
    <CustomAction Id="CleanupDesktopShortcut" Directory="SystemFolder" Execute="deferred" Impersonate="yes" Return="ignore" ExeCommand='cmd.exe /c del /f /q "[DesktopFolder]${xml(appName)}.lnk"' />
    <CustomAction Id="CleanupStartMenuFolder" Directory="SystemFolder" Execute="deferred" Impersonate="yes" Return="ignore" ExeCommand='cmd.exe /c rmdir /s /q "[ApplicationProgramsFolder]"' />
    <InstallExecuteSequence>
      <Custom Action="CleanupDesktopShortcut" After="RemoveShortcuts">REMOVE="ALL"</Custom>
      <Custom Action="CleanupStartMenuFolder" After="CleanupDesktopShortcut">REMOVE="ALL"</Custom>
    </InstallExecuteSequence>

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="WindowsFolder">
        <Directory Id="SystemFolder" Name="System32" />
      </Directory>
      <Directory Id="LocalAppDataFolder">
        <Directory Id="ProgramsFolder" Name="Programs">
          <Directory Id="INSTALLFOLDER" Name="${xml(appName)}" />
        </Directory>
      </Directory>
      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="${xml(appName)}" />
      </Directory>
      <Directory Id="DesktopFolder" />
    </Directory>

    <DirectoryRef Id="INSTALLFOLDER">
      <Component Id="ApplicationShortcuts" Guid="D16716F9-34AA-4736-B71A-0DA519F8B791">
        <Shortcut Id="StartMenuShortcut" Directory="ApplicationProgramsFolder" Name="${xml(appName)}" Description="${xml(description)}" Target="[INSTALLFOLDER]${xml(exeName)}" WorkingDirectory="INSTALLFOLDER" Advertise="no" />
        <Shortcut Id="DesktopShortcut" Directory="DesktopFolder" Name="${xml(appName)}" Description="${xml(description)}" Target="[INSTALLFOLDER]${xml(exeName)}" WorkingDirectory="INSTALLFOLDER" Advertise="no" />
        <RemoveFile Id="RemoveStartMenuShortcut" Directory="ApplicationProgramsFolder" Name="${xml(appName)}.lnk" On="uninstall" />
        <RemoveFile Id="RemoveDesktopShortcut" Directory="DesktopFolder" Name="${xml(appName)}.lnk" On="uninstall" />
        <RemoveFolder Id="ApplicationProgramsFolder" Directory="ApplicationProgramsFolder" On="uninstall" />
        <RemoveFolder Id="InstallFolder" Directory="INSTALLFOLDER" On="uninstall" />
        <RegistryValue Root="HKCU" Key="Software\\${xml(appName)}" Name="installed" Type="integer" Value="1" KeyPath="yes" />
      </Component>
    </DirectoryRef>

    <Feature Id="DefaultFeature" Title="${xml(appName)}" Level="1">
      <ComponentGroupRef Id="AppFiles" />
      <ComponentRef Id="ApplicationShortcuts" />
    </Feature>
  </Product>
</Wix>
`;
}

function xml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');
}

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

function run(command, args, errorMessage) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(errorMessage);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
