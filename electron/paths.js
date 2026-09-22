const path = require('path');

/** Locates komorebic.exe: explicit path, then common install locations, then PATH. */
function resolveKomorebic(explicit) {
  const candidates = [];
  if (explicit && explicit.trim()) candidates.push(explicit.replace(/^"(.*)"$/, '$1'));
  candidates.push(
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'komorebi', 'bin', 'komorebic.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'komorebi', 'bin', 'komorebic.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'komorebic.exe'),
    path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'komorebi', 'current', 'komorebic.exe'),
    'komorebic.exe'
  );
  const fs = require('fs');
  for (const c of candidates) {
    if (c === 'komorebic.exe') return c;
    if (fs.existsSync(c)) return c;
  }
  return 'komorebic.exe';
}

function defaultPaths() {
  const home = process.env.USERPROFILE || process.cwd();
  return {
    komorebicPath: resolveKomorebic(null),
    configPath: path.join(home, 'komorebi.json'),
    appsConfigPath: path.join(home, 'applications.json'),
    schemaPath: path.join(__dirname, '..', 'schema.json'),
    schemaAscPath: path.join(__dirname, '..', 'schema.asc.json')
  };
}

module.exports = { resolveKomorebic, defaultPaths };