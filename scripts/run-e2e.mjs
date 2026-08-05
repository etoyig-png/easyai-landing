import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Spawn Node directly against Playwright's CLI script rather than the node_modules/.bin
// wrapper (a .cmd file on Windows) — invoking .cmd files via spawn() is unreliable across
// platforms (quoting/shell requirements differ), while the underlying JS entry point works
// identically everywhere. Mirrors mr-life-command-center/scripts/run-e2e.mjs exactly.
const playwrightCli = path.join(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');

function runPlaywright(env) {
  const child = spawn(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env
  });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

// The @sparticuz/chromium binary is a Linux-only build made for locked-down serverless/CI
// sandboxes. On any other platform (e.g. a developer running tests on Windows or macOS) it
// can't execute at all, so fall back to Playwright's own bundled browser instead of doing the
// Linux-specific extraction below.
if (process.platform !== 'linux') {
  runPlaywright(process.env);
} else {
  const browserTempDirectory = path.join(process.cwd(), '.playwright-runtime-149');
  await mkdir(browserTempDirectory, { recursive: true });
  process.env.TMPDIR = browserTempDirectory;
  process.env.FONTCONFIG_PATH = path.join(browserTempDirectory, 'fonts');

  // tar-fs attempts chown when Node reports uid 0. This managed workspace rejects chown,
  // even inside writable directories, so disable that extraction-only ownership step.
  Object.defineProperty(process, 'getuid', { value: () => 1000 });

  const { default: chromium } = await import('@sparticuz/chromium');
  const executablePath = await chromium.executablePath();
  const extractedFontRoot = path.join(browserTempDirectory, 'fonts');
  const fontDirectory = path.join(extractedFontRoot, 'fonts', 'Open_Sans');
  const fontCacheDirectory = path.join(browserTempDirectory, 'fonts-cache');
  await mkdir(extractedFontRoot, { recursive: true });
  await mkdir(fontCacheDirectory, { recursive: true });
  await writeFile(
    path.join(extractedFontRoot, 'fonts.conf'),
    `<?xml version="1.0"?>
<fontconfig>
  <dir>${fontDirectory}</dir>
  <cachedir>${fontCacheDirectory}</cachedir>
</fontconfig>
`
  );
  process.env.FONTCONFIG_PATH = extractedFontRoot;
  process.env.FONTCONFIG_FILE = 'fonts.conf';

  runPlaywright({
    ...process.env,
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: executablePath
  });
}
