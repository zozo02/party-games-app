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
const { findChannel, findRole } = require('./setup');
const { upsertPanel } = require('./panels');

const ACCEPT_ID = 'rules:accept';
const RULES_FILE = path.join(__dirname, '..', 'textes', 'reglement.md');

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

async function postRules(channel, log) {
  await upsertPanel(channel, ACCEPT_ID, buildRules(channel.guild), 'Règlement', log);
}

// Clic sur "J'accepte le règlement" : on donne le rôle Membre (accès au serveur).
async function handleComponent(interaction) {
  if (!interaction.isButton() || interaction.customId !== ACCEPT_ID) return false;

  const role = findRole(interaction.guild, 'membre');
  if (!role) {
    await interaction.reply({ content: 'Rôle Membre introuvable, un admin doit lancer /setup.', flags: MessageFlags.Ephemeral });
    return true;
  }
  if (interaction.member.roles.cache.has(role.id)) {
    await interaction.reply({ content: 'Tu as déjà accepté le règlement ♡', flags: MessageFlags.Ephemeral });
    return true;
  }
  await interaction.member.roles.add(role, 'Règlement accepté');
  await interaction.reply({
    content: 'Merci ! Tu as maintenant accès à tout le serveur ✨',
    flags: MessageFlags.Ephemeral,
  });
  return true;
}

module.exports = { postRules, handleComponent };
