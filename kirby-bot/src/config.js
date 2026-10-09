require('dotenv').config({ quiet: true });

const list = (value) =>
  (value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const text = (value, fallback = '') => (value || '').trim() || fallback;

const env = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  pseudo: text(process.env.PSEUDO, 'Kirby'),
  serverName: text(process.env.SERVER_NAME, 'Kirby World'),
  staffRoleIds: list(process.env.STAFF_ROLE_IDS),
  memberRoleId: text(process.env.MEMBER_ROLE_ID),
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
