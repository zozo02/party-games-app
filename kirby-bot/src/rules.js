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

// Rôle donné en acceptant le règlement : MEMBER_ROLE_ID, sinon le rôle qui s'appelle "Membre".
const getMemberRole = (guild) =>
  (env.memberRoleId && guild.roles.cache.get(env.memberRoleId)) || findRoleByName(guild, 'Membre');

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
  if (!getMemberRole(channel.guild)) {
    log('⚠️ Aucun rôle Membre trouvé : mets son ID dans MEMBER_ROLE_ID (.env) ou crée un rôle "Membre".');
  }
  await upsertPanel(channel, ACCEPT_ID, buildRules(channel.guild), 'Règlement', log);
}

// Clic sur "J'accepte le règlement" : on donne le rôle Membre.
async function handleComponent(interaction) {
  if (!interaction.isButton() || interaction.customId !== ACCEPT_ID) return false;

  const role = getMemberRole(interaction.guild);
  if (!role) {
    await ephemeral(interaction, 'Rôle Membre introuvable, préviens un admin.');
  } else if (interaction.member.roles.cache.has(role.id)) {
    await ephemeral(interaction, 'Tu as déjà accepté le règlement ♡');
  } else {
    try {
      await interaction.member.roles.add(role, 'Règlement accepté');
      await ephemeral(interaction, 'Merci ! Tu as maintenant accès au serveur ✨');
    } catch (err) {
      await ephemeral(interaction, `Je n’ai pas pu te donner le rôle : ${explainError(err)}`);
    }
  }
  return true;
}

module.exports = { postRules, handleComponent };
