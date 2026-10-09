const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ quiet: true });

const list = (value) =>
  (value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const text = (value, fallback = '') => (value || '').trim() || fallback;

// Toutes les valeurs d'une variable du .env : séparées par des virgules sur une ligne, ou sur
// plusieurs lignes (un .env normal ne garde que la dernière ligne d'un même nom).
function listFromEnv(...names) {
  const values = names.map((name) => process.env[name]);
  try {
    const file = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    for (const line of file.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (match && names.includes(match[1])) {
        values.push(match[2].replace(/\s+#.*$/, '').replace(/^["']|["']$/g, ''));
      }
    }
  } catch {
    // pas de fichier .env (variables définies autrement, par exemple sur le VPS)
  }
  return [...new Set(values.flatMap(list))];
}

const env = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  pseudo: text(process.env.PSEUDO, 'Kirby'),
  serverName: text(process.env.SERVER_NAME, 'Kirby World'),
  staffRoleIds: list(process.env.STAFF_ROLE_IDS),
  memberRoleIds: listFromEnv('MEMBER_ROLE_IDS', 'MEMBER_ROLE_ID'),
  hommeRoleId: text(process.env.HOMME_ROLE_ID),
  femmeRoleId: text(process.env.FEMME_ROLE_ID),
  ticketThumbnailUrl: text(process.env.TICKET_MINIATURE_URL),
  ticketImageUrl: text(process.env.TICKET_IMAGE_URL),
};

// ---------------------------------------------------------------------------
// Tickets : un choix du menu déroulant = un type de ticket = une catégorie.
// ---------------------------------------------------------------------------

const TICKET_TYPES = [
  {
    value: 'prestation',
    label: 'PRESTATION',
    emoji: '💖',
    channelEmoji: '🌸',
    description: 'Une demande ou une commande de prestation',
    category: '🌸 • Tickets Prestations',
    categoryEnv: process.env.CATEGORIE_PRESTATION_ID,
  },
  {
    value: 'question',
    label: 'QUESTION',
    emoji: '💖',
    channelEmoji: '❓',
    description: 'Une question ou une demande d’information',
    category: '❓ • Tickets Questions',
    categoryEnv: process.env.CATEGORIE_QUESTION_ID,
  },
  {
    value: 'report',
    label: 'REPORT',
    emoji: '💖',
    channelEmoji: '🚩',
    description: 'Signaler un problème ou un comportement',
    category: '🚩 • Tickets Reports',
    categoryEnv: process.env.CATEGORIE_REPORT_ID,
  },
];

const TICKET_PANEL = {
  title: `Espace Tickets • ${env.serverName}`,
  text: 'N’hésitez pas à faire un ticket pour toute demande ou toute commande, nous vous répondrons le plus rapidement possible.',
  placeholder: 'Fais un choix',
  color: 0xff6ec7,
};

// ---------------------------------------------------------------------------
// Choix du genre
// ---------------------------------------------------------------------------

const GENDERS = [
  {
    key: 'homme',
    label: 'Homme',
    emoji: '♂️',
    roleId: env.hommeRoleId,
    defaultName: 'Homme',
    color: 0x5865f2,
  },
  {
    key: 'femme',
    label: 'Femme',
    emoji: '♀️',
    roleId: env.femmeRoleId,
    defaultName: 'Femme',
    color: 0xed4245,
  },
];

module.exports = { env, TICKET_TYPES, TICKET_PANEL, GENDERS };
