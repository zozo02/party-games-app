const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  EmbedBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  PermissionFlagsBits: P,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { TICKET_TYPES, TICKET_PANEL, STAFF_ROLES } = require('./config');
const { findChannel, findRole } = require('./setup');

const OPEN_ID = 'ticket:open';
const CLOSE_ID = 'ticket:close';
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Bannière locale (assets/ticket.png, .jpg, .gif ou .webp) en priorité, sinon TICKET_IMAGE_URL.
function findBanner() {
  for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
    const file = path.join(ASSETS_DIR, `ticket.${ext}`);
    if (fs.existsSync(file)) return { file, name: `ticket.${ext}` };
  }
  return null;
}

// Le panneau du salon #tickets : bannière, texte, avertissement, menu "Fais un choix".
function buildPanel() {
  const banner = findBanner();
  const imageUrl = banner ? `attachment://${banner.name}` : TICKET_PANEL.imageUrl;

  const container = new ContainerBuilder().setAccentColor(TICKET_PANEL.color);
  if (imageUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imageUrl)),
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${TICKET_PANEL.title}`));
  }
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${TICKET_PANEL.text}`));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(OPEN_ID)
    .setPlaceholder('Fais un choix')
    .addOptions(
      TICKET_TYPES.map((t) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(t.label)
          .setValue(t.value)
          .setDescription(t.description)
          .setEmoji(t.emoji),
      ),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container,
      new TextDisplayBuilder().setContent(TICKET_PANEL.warning),
      new ActionRowBuilder().addComponents(menu),
    ],
    files: banner ? [new AttachmentBuilder(banner.file, { name: banner.name })] : [],
  };
}

// Poste le panneau dans #tickets, ou met à jour celui qui y est déjà.
async function postPanel(channel, log = console.log) {
  const messages = await channel.messages.fetch({ limit: 50 });
  const existing = messages.find(
    (m) => m.author.id === channel.client.user.id && JSON.stringify(m.components).includes(OPEN_ID),
  );
  const panel = buildPanel();
  if (existing) {
    await existing.edit({ ...panel, attachments: [] });
    log('Panneau des tickets mis à jour.');
  } else {
    await channel.send(panel);
    log('Panneau des tickets posté.');
  }
}

// Quelqu'un a choisi "Paiement" ou "Question" dans le menu.
async function openTicket(interaction) {
  const type = TICKET_TYPES.find((t) => t.value === interaction.values[0]);
  const { guild, user } = interaction;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const marker = `ticket:${type.value}:${user.id}`;
  const already = guild.channels.cache.find((c) => c.topic === marker);
  if (already) return interaction.editReply(`Tu as déjà un ticket ${type.label} ouvert : ${already}`);

  const category = findChannel(guild, [ChannelType.GuildCategory], type.category);
  if (!category) return interaction.editReply('Les catégories de tickets n’existent pas, un admin doit lancer /setup.');

  // Mêmes droits que la catégorie (staff seulement) + la personne qui ouvre le ticket.
  const overwrites = category.permissionOverwrites.cache.map((o) => ({
    id: o.id,
    type: o.type,
    allow: o.allow,
    deny: o.deny,
  }));
  overwrites.push({
    id: user.id,
    allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks],
  });

  const name = `${type.emoji}-${type.value}-${user.username}`.slice(0, 100);
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: marker,
    permissionOverwrites: overwrites,
  });

  const staff = STAFF_ROLES.map((key) => findRole(guild, key)).filter(Boolean);
  const embed = new EmbedBuilder()
    .setColor(TICKET_PANEL.color)
    .setTitle(`${type.emoji} Ticket ${type.label}`)
    .setDescription(
      `Merci ${user} ♡\n\n` +
        'Explique ta demande ici avec un maximum de détails, on te répond le plus vite possible.\n' +
        'Quand c’est réglé, clique sur **Fermer le ticket**.',
    );
  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CLOSE_ID).setLabel('Fermer le ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );
  await channel.send({
    content: [user, ...staff].join(' '),
    embeds: [embed],
    components: [closeRow],
    allowedMentions: { users: [user.id], roles: staff.map((r) => r.id) },
  });

  await interaction.editReply(`Ton ticket est ouvert : ${channel}`);
}

// Bouton "Fermer le ticket" : la personne du ticket ou le staff peuvent fermer.
async function closeTicket(interaction) {
  const { channel, member } = interaction;
  const ownerId = channel.topic?.split(':')[2];
  const allowed = member.id === ownerId || member.permissions.has(P.ManageChannels);
  if (!allowed) {
    return interaction.reply({ content: 'Tu ne peux pas fermer ce ticket.', flags: MessageFlags.Ephemeral });
  }
  await interaction.reply(`🔒 Ticket fermé par ${member}. Le salon sera supprimé dans 5 secondes.`);
  setTimeout(() => channel.delete('Ticket fermé').catch(() => null), 5000);
}

async function handleTicketInteraction(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === OPEN_ID) {
    await openTicket(interaction);
    return true;
  }
  if (interaction.isButton() && interaction.customId === CLOSE_ID) {
    await closeTicket(interaction);
    return true;
  }
  return false;
}

module.exports = { postPanel, buildPanel, handleTicketInteraction };
