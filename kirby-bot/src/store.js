// Petit stockage persistant (data/settings.json) pour les réglages modifiables
// depuis Discord : message de bienvenue, giveaways en cours, etc.
// Ce fichier n'est pas versionné, il survit donc aux mises à jour du bot.
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'data', 'settings.json');

let data = {};
try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  data = {};
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

const get = (key, fallback) => (data[key] === undefined ? fallback : data[key]);

function set(key, value) {
  data[key] = value;
  save();
}

module.exports = { get, set };
