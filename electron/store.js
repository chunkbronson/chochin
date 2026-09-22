const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: 'File does not exist', value: null };
    const raw = fs.readFileSync(filePath, 'utf8');
    return { ok: true, value: JSON.parse(raw), raw };
  } catch (err) {
    return { ok: false, error: err.message, value: null };
  }
}

function writeJsonFile(filePath, value) {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const backup = `${filePath}.bak`;
      if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backup);
      const raw = JSON.stringify(value, null, 2);
      fs.writeFileSync(filePath, raw + '\n', 'utf8');
      resolve({ ok: true, backup });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { readJsonFile, writeJsonFile };