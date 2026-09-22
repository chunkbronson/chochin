const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFile } = require('child_process');

// masir is a focus-follows-mouse daemon; it has no built-in toggle command,
// so chochin controls it by starting/stopping the process. Detection checks
// common install locations because the PATH entry may not be refreshed, and
// remembers the last-known path so a stopped masir can be restarted.
const CANDIDATE_PATHS = [
  path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'masir.exe'),
  path.join(os.homedir(), '.cargo', 'bin', 'masir.exe'),
  path.join('C:', 'Program Files', 'masir', 'bin', 'masir.exe'),
  path.join('C:', 'Program Files (x86)', 'masir', 'bin', 'masir.exe'),
  path.join('C:', 'Program Files', 'masir', 'masir.exe'),
  path.join('C:', 'Program Files (x86)', 'masir', 'masir.exe')
];

let lastKnownExe = null;

function sweepCandidatePaths() {
  try {
    const winGetPackages = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(winGetPackages)) {
      const dirs = fs.readdirSync(winGetPackages).filter((d) => /^LGUG2Z\.masir/i.test(d));
      for (const d of dirs) {
        const candidate = path.join(winGetPackages, d, 'masir.exe');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch (e) {
    /* ignore scan errors */
  }
  return null;
}

function resolveKnownExe() {
  const swept = sweepCandidatePaths();
  if (swept) {
    lastKnownExe = swept;
    return swept;
  }
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) {
      lastKnownExe = p;
      return p;
    }
  }
  if (lastKnownExe && fs.existsSync(lastKnownExe)) return lastKnownExe;
  return null;
}

function runPs(script) {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 10000, windowsHide: true }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: String(stdout || '').trim(), stderr: String(stderr || '').trim() });
    });
  });
}

const STATUS_SCRIPT = [
  '$p = Get-Process masir -ErrorAction SilentlyContinue',
  '$c = Get-Command masir -ErrorAction SilentlyContinue',
  '$exe = if ($p) { $p[0].Path } elseif ($c) { $c.Source } else { $null }',
  '[PSCustomObject]@{ running = [bool]$p; exe = $exe } | ConvertTo-Json -Compress'
].join('; ');

async function masirStatus() {
  const knownExe = resolveKnownExe();
  const res = await runPs(STATUS_SCRIPT);
  if (!res.ok) return { ok: false, output: res.stderr || 'masir status check failed' };
  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch (e) {
    return { ok: false, output: res.stdout || 'unexpected masir status output' };
  }
  const exe = parsed.exe || knownExe || null;
  if (exe && fs.existsSync(exe)) lastKnownExe = exe;
  return {
    ok: true,
    detected: Boolean(exe) || !!parsed.running,
    running: !!parsed.running,
    exe
  };
}

async function masirToggle() {
  const status = await masirStatus();
  if (!status.ok) return status;

  if (status.running) {
    const res = await runPs('Stop-Process -Name masir -Force');
    if (!res.ok) return { ok: false, output: res.stderr || 'failed to stop masir' };
    await sleep(400);
  } else {
    if (!status.exe) return { ok: false, output: 'masir not found - install it first' };
    const safe = status.exe.replace(/'/g, "''");
    const res = await runPs(`Start-Process -FilePath '${safe}' -WindowStyle Hidden`);
    if (!res.ok) return { ok: false, output: res.stderr || 'failed to start masir' };
    await sleep(600);
  }

  const after = await masirStatus();
  if (!after.ok) return after;
  return {
    ...after,
    output: after.running ? 'masir started' : 'masir stopped'
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { masirStatus, masirToggle };