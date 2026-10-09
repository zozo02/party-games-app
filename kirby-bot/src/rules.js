const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { env } = require('./config');
const { findChannel, findRoleByName, ephemeral, explainError } = require('./util');
const { upsertPanel } = require('./panels');

const ACCEPT_ID = 'rules:accept';
const RULES_FILE = path.join(__dirname, '..', 'textes', 'reglement.md');

// Rôles donnés en acceptant le règlement : MEMBER_ROLE_IDS (un ou plusieurs),
// sinon le rôle qui s'appelle "Membre".
function getMemberRoles(guild) {
  const byId = env.memberRoleIds.map((id) => guild.roles.cache.get(id)).filter(Boolean);
  if (byId.length) return byId;
  const byName = findRoleByName(guild, 'Membre');
  return byName ? [byName] : [];
}

// "#tickets" dans le texte devient une vraie mention cliquable du salon.
const linkChannels = (guild, text) =>
  text.replace(/#([\p{L}\p{N}-]+)/gu, (match, slug) => {
    const channel = findChannel(guild, [ChannelType.GuildText, ChannelType.GuildForum], slug);
    return channel ? `${channel}` : match;
  });

function buildRules(guild) {
  const text = linkChannels(guild, fs.readFileSync(RULES_FILE, 'utf8').trim());
  const button = new ButtonBuilder()
    .setCustomId(ACCEPT_ID)
    .setLabel('J’accepte le règlement')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);

  const container = new ContainerBuilder()
    .setAccentColor(0xff6ec7)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(button));

  return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

async function postRules(channel, log = console.log) {
  const { guild } = channel;
  const found = getMemberRoles(guild);
  if (!found.length) {
    log('⚠️ Aucun rôle Membre trouvé : mets son ID dans MEMBER_ROLE_IDS (.env) ou crée un rôle "Membre".');
  } else {
    log(`Rôles donnés avec le bouton : ${found.map((r) => r.name).join(', ')}`);
  }
  for (const id of env.memberRoleIds.filter((id) => !guild.roles.cache.has(id))) {
    log(`⚠️ Rôle introuvable sur ce serveur (ID ${id}) : vérifie MEMBER_ROLE_IDS dans le .env.`);
  }
  await upsertPanel(channel, ACCEPT_ID, buildRules(channel.guild), 'Règlement', log);
}

// Clic sur "J'accepte le règlement" : on donne tous les rôles Membre qui manquent.
async function handleComponent(interaction) {
  if (!interaction.isButton() || interaction.customId !== ACCEPT_ID) return false;

  const roles = getMemberRoles(interaction.guild);
  const missing = roles.filter((role) => !interaction.member.roles.cache.has(role.id));
  if (!roles.length) {
    await ephemeral(interaction, 'Rôle Membre introuvable, préviens un admin.');
  } else if (!missing.length) {
    await ephemeral(interaction, 'Tu as déjà accepté le règlement ♡');
  } else {
    try {
      await interaction.member.roles.add(missing, 'Règlement accepté');
      await ephemeral(interaction, 'Merci ! Tu as maintenant accès au serveur ✨');
    } catch (err) {
      await ephemeral(interaction, `Je n’ai pas pu te donner le rôle : ${explainError(err)}`);
    }
  }
  return true;
}

module.exports = { postRules, handleComponent };
