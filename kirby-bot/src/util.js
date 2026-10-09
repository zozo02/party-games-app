const { PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const { env } = require('./config');

// "💫 • Bienvenue •" -> "bienvenue" : permet de retrouver un salon ou un rôle même
// avec des emojis ou des décorations dans son nom.
const norm = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const findChannel = (guild, types, name) =>
  guild.channels.cache.find((c) => types.includes(c.type) && norm(c.name) === norm(name));

const findRoleByName = (guild, name) => guild.roles.cache.find((r) => norm(r.name) === norm(name));

// Staff = un des rôles STAFF_ROLE_IDS, ou la permission de gérer les salons.
const isStaff = (member) =>
  member.permissions.has(P.ManageChannels) || env.staffRoleIds.some((id) => member.roles.cache.has(id));

const ephemeral = (interaction, content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

// Messages d'erreur clairs quand le bot n'a pas le droit de faire quelque chose.
const explainError = (err) =>
  err?.code === 50013
    ? 'Je n’ai pas la permission de faire ça. Mets le rôle du bot **au-dessus** des autres rôles (Paramètres du serveur > Rôles) et donne-lui la permission Administrateur.'
    : err.message;

module.exports = { norm, findChannel, findRoleByName, isStaff, ephemeral, explainError };
