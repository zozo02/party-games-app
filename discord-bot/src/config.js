require('dotenv').config({ quiet: true });
const { PermissionFlagsBits: P, ChannelType } = require('discord.js');

const PSEUDO = (process.env.PSEUDO || 'littledesire').trim();

const ids = (value) =>
  (value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const env = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  serverName: (process.env.SERVER_NAME || '').trim(),
  autoSetup: (process.env.AUTO_SETUP || 'true').toLowerCase() !== 'false',
  fondateurIds: ids(process.env.FONDATEUR_IDS),
  creatriceIds: ids(process.env.CREATRICE_IDS),
  managerIds: ids(process.env.MANAGER_IDS),
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

// Ce que tout le monde (@everyone et Membre) peut faire sur le serveur.
const MEMBER_PERMS = [
  P.ViewChannel,
  P.ReadMessageHistory,
  P.SendMessages,
  P.SendMessagesInThreads,
  P.AddReactions,
  P.AttachFiles,
  P.UseApplicationCommands,
  P.Connect,
  P.Speak,
  P.UseVAD,
];

// Clients : un peu plus que les membres.
const CLIENT_PERMS = [
  ...MEMBER_PERMS,
  P.EmbedLinks,
  P.UseExternalEmojis,
  P.UseExternalStickers,
  P.ChangeNickname,
  P.SendVoiceMessages,
];

// Friends : un peu plus que les clients, sans être admin.
const FRIEND_PERMS = [
  ...CLIENT_PERMS,
  P.CreatePublicThreads,
  P.Stream,
  P.UseSoundboard,
  P.UseExternalSounds,
  P.PrioritySpeaker,
];

// Salons en lecture seule : personne ne peut écrire (les admins si).
const READ_ONLY_DENY = [
  P.SendMessages,
  P.SendMessagesInThreads,
  P.CreatePublicThreads,
  P.CreatePrivateThreads,
];

// ---------------------------------------------------------------------------
// Rôles (du plus haut au plus bas dans la liste des membres)
// ---------------------------------------------------------------------------

const ROLES = [
  { key: 'fondateur', name: 'Fondateur', color: 0xe0115f, hoist: true, permissions: [P.Administrator] },
  { key: 'creatrice', name: `${PSEUDO} ♡`, color: 0xff6ec7, hoist: true, permissions: [P.Administrator] },
  { key: 'manager', name: '.⁺˖♡ Manager', color: 0x9d4edd, hoist: true, permissions: [P.Administrator] },
  { key: 'friends', name: '⏾˖.˚ Little Friends', color: 0xc77dff, hoist: true, permissions: FRIEND_PERMS },
  { key: 'clients', name: '⋆˚✧ Little Client', color: 0xffafcc, hoist: true, permissions: CLIENT_PERMS },
  { key: 'membre', name: 'Membre', color: 0xbdb2ff, hoist: true, permissions: MEMBER_PERMS },
];

// ---------------------------------------------------------------------------
// Catégories et salons
// ---------------------------------------------------------------------------

// Discord transforme les espaces des salons texte en "-", donc on utilise
// des espaces fins (U+2009) pour garder le style "💫 • bienvenue •".
const S = ' ';
const channel = (emoji, name, extra = {}) => ({
  name: `${emoji}${S}•${S}${name}${S}•`,
  slug: name,
  type: ChannelType.GuildText,
  ...extra,
});

const CATEGORIES = [
  {
    name: '☾ • Accueil',
    readOnly: true,
    channels: [
      channel('💫', 'bienvenue', { topic: 'Bienvenue dans l’univers ♡' }),
      channel('🌕', 'annonces', { topic: 'Les annonces importantes du serveur.' }),
      channel('📋', 'règlement', { topic: 'Le règlement à lire et à accepter.' }),
      channel('🔭', 'boosts', { topic: 'Merci à toutes les personnes qui boostent le serveur ♡', boosts: true }),
      channel('✨', 'giveaways', { topic: 'Les petits cadeaux pour la communauté.' }),
    ],
  },
  {
    name: '✶ ·.˚ LITTLE UNIVERSE',
    readOnly: true,
    channels: [
      channel('🔞', 'previews', { topic: 'Aperçus du contenu. Réservé aux majeurs (18+).', nsfw: true }),
      channel('🗂️', 'pack-speciaux', {
        type: ChannelType.GuildForum,
        topic: 'Demandes et discussions autour des packs spéciaux. Réservé aux majeurs (18+).',
        nsfw: true,
        writable: true,
      }),
      channel('🛍️', 'tarifs', { topic: 'Tous les tarifs.' }),
      channel('🦋', 'moyens-de-paiement', { topic: 'Les moyens de paiement acceptés.' }),
      channel('🎁', 'wishlist', { topic: 'La wishlist ♡' }),
      channel('🌠', 'avis', { topic: 'Les avis des clients : du réel, pas du scam.' }),
    ],
  },
  {
    name: '✧ • SUPPORT',
    readOnly: true,
    channels: [channel('🪐', 'tickets', { topic: 'Le système de tickets arrive bientôt.' })],
  },
  {
    name: '.✦. • Communauté',
    readOnly: false,
    channels: [
      channel('💬', 'discussion', { topic: 'Discussion générale.' }),
      channel('📷', 'medias', { topic: 'Partagez vos photos, vidéos et memes.' }),
      channel('🐦‍🔥', 'vos-selfies', { topic: 'Vos plus beaux selfies ♡' }),
      channel('💭', 'idees', { topic: 'Vos idées pour améliorer le serveur.' }),
    ],
  },
];

module.exports = { env, PSEUDO, ROLES, CATEGORIES, READ_ONLY_DENY };
