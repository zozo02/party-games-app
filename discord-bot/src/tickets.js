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
  ModalBuilder,
  PermissionFlagsBits: P,
  SeparatorBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { TICKET_TYPES, TICKET_PANEL, STAFF_ROLES } = require('./config');
const { findChannel, findRole } = require('./setup');
const { upsertPanel } = require('./panels');

const OPEN_ID = 'ticket:open';
const CLOSE_ID = 'ticket:close';
const CLAIM_ID = 'ticket:claim';
const RENAME_ID = 'ticket:rename';
const RENAME_MODAL_ID = 'ticket:rename-modal';
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
async function postPanel(channel, log) {
  await upsertPanel(channel, OPEN_ID, buildPanel(), 'Panneau des tickets', log);
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
  await channel.send({
    content: [user, ...staff].join(' '),
    embeds: [embed],
    components: [ticketButtons()],
    allowedMentions: { users: [user.id], roles: staff.map((r) => r.id) },
  });

  await interaction.editReply(`Ton ticket est ouvert : ${channel}`);
}

// Boutons sous le message d'ouverture du ticket.
function ticketButtons(claimedBy) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLAIM_ID)
      .setEmoji('🙋')
      .setLabel(claimedBy ? `Pris en charge par ${claimedBy}`.slice(0, 80) : 'Prendre en charge')
      .setStyle(ButtonStyle.Success)
      .setDisabled(Boolean(claimedBy)),
    new ButtonBuilder().setCustomId(RENAME_ID).setEmoji('✏️').setLabel('Renommer').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CLOSE_ID).setEmoji('🔒').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
  );
}

const isTicket = (channel) => Boolean(channel?.topic?.startsWith('ticket:'));
const isStaff = (member) => member.permissions.has(P.ManageChannels);
const ephemeral = (interaction, content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

// Bouton "Prendre en charge" : réservé au staff.
async function claimTicket(interaction) {
  const { member } = interaction;
  if (!isStaff(member)) return ephemeral(interaction, 'Seul le staff peut prendre en charge un ticket.');
  await interaction.update({ components: [ticketButtons(member.displayName)] });
  await interaction.channel.send(`🙋 ${member} prend en charge ce ticket.`);
}

// Renomme un ticket en gardant l'emoji de son type (💳 / ❓) devant.
async function renameTicket(interaction, newName) {
  const { channel } = interaction;
  const type = TICKET_TYPES.find((t) => t.value === channel.topic.split(':')[1]);
  const name = `${type ? `${type.emoji}-` : ''}${newName}`.slice(0, 100);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  // Discord limite les renommages à 2 toutes les 10 minutes par salon : on n'attend pas plus de 5 s.
  const done = await Promise.race([
    channel.setName(name).then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);
  await interaction.editReply(
    done
      ? `Ticket renommé en **${channel.name}** ✅`
      : 'Discord limite à 2 renommages toutes les 10 minutes : le nouveau nom sera appliqué dès que possible.',
  );
}

function renameModal(channel) {
  const input = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Nouveau nom')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(90);
  const current = channel.name.replace(/^\p{Extended_Pictographic}\uFE0F?-/u, '');
  if (current) input.setValue(current.slice(0, 90));
  return new ModalBuilder()
    .setCustomId(RENAME_MODAL_ID)
    .setTitle('Renommer le ticket')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

// Bouton "Fermer le ticket" : la personne du ticket ou le staff peuvent fermer.
async function closeTicket(interaction) {
  const { channel, member } = interaction;
  const ownerId = channel.topic?.split(':')[2];
  if (member.id !== ownerId && !isStaff(member)) return ephemeral(interaction, 'Tu ne peux pas fermer ce ticket.');
  await interaction.reply(`🔒 Ticket fermé par ${member}. Le salon sera supprimé dans 5 secondes.`);
  setTimeout(() => channel.delete('Ticket fermé').catch(() => null), 5000);
}

const command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gérer le ticket actuel')
    .setDefaultMemberPermissions(P.ManageChannels)
    .addSubcommand((s) =>
      s
        .setName('renommer')
        .setDescription('Renommer ce ticket')
        .addStringOption((o) => o.setName('nom').setDescription('Le nouveau nom').setRequired(true).setMaxLength(90)),
    ),
  async execute(interaction) {
    if (!isTicket(interaction.channel)) return ephemeral(interaction, 'Cette commande marche seulement dans un ticket.');
    await renameTicket(interaction, interaction.options.getString('nom'));
  },
};

async function handleComponent(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === OPEN_ID) {
    await openTicket(interaction);
    return true;
  }
  if (interaction.isButton() && interaction.customId === CLOSE_ID) {
    await closeTicket(interaction);
    return true;
  }
  if (interaction.isButton() && interaction.customId === CLAIM_ID) {
    await claimTicket(interaction);
    return true;
  }
  if (interaction.isButton() && interaction.customId === RENAME_ID) {
    if (!isStaff(interaction.member)) await ephemeral(interaction, 'Seul le staff peut renommer un ticket.');
    else await interaction.showModal(renameModal(interaction.channel));
    return true;
  }
  if (interaction.isModalSubmit() && interaction.customId === RENAME_MODAL_ID) {
    await renameTicket(interaction, interaction.fields.getTextInputValue('name'));
    return true;
  }
  return false;
}

module.exports = { postPanel, buildPanel, handleComponent, commands: [command] };
