const { execFile } = require('child_process');
const { resolveKomorebic } = require('./paths');

/** Runs komorebic with the given args. Resolves { ok, output } with the merged stdout+stderr. */
function runKomorebic(komorebicPath, args) {
  return new Promise((resolve) => {
    const exe = resolveKomorebic(komorebicPath);
    execFile(exe, args, { timeout: 20000, windowsHide: true }, (error, stdout, stderr) => {
      const output = `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim();
      if (error) {
        resolve({ ok: false, code: typeof error.code === 'number' ? error.code : String(error.code ?? ''), output: output || error.message });
      } else {
        resolve({ ok: true, output });
      }
    });
  });
}

module.exports = { runKomorebic };