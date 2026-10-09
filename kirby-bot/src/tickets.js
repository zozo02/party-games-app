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
  SectionBuilder,
  SeparatorBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
} = require('discord.js');
const { env, TICKET_TYPES, TICKET_PANEL } = require('./config');
const { findChannel, isStaff, ephemeral } = require('./util');
const { upsertPanel } = require('./panels');
const store = require('./store');

const OPEN_ID = 'ticket:open';
const CLOSE_ID = 'ticket:close';
const CLAIM_ID = 'ticket:claim';
const RENAME_ID = 'ticket:rename';
const RENAME_MODAL_ID = 'ticket:rename-modal';
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

// ---------------------------------------------------------------------------
// Catégories : une par type de ticket (prestation, question, report)
// ---------------------------------------------------------------------------

const staffRoles = (guild) => env.staffRoleIds.map((id) => guild.roles.cache.get(id)).filter(Boolean);

// Retrouve la catégorie d'un type : ID du .env, sinon celle créée par /installer tickets, sinon par son nom.
function getCategory(guild, type) {
  const isCategory = (c) => c?.type === ChannelType.GuildCategory;
  const byEnv = type.categoryEnv && guild.channels.cache.get(type.categoryEnv.trim());
  if (isCategory(byEnv)) return byEnv;
  const byStore = guild.channels.cache.get(store.get('ticketCategories', {})[type.value]);
  if (isCategory(byStore)) return byStore;
  return findChannel(guild, [ChannelType.GuildCategory], type.category);
}

// Crée seulement les catégories qui n'existent pas encore : invisibles sauf pour le staff.
async function ensureCategories(guild, log) {
  const me = await guild.members.fetchMe();
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
    {
      id: me.id,
      allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageChannels, P.EmbedLinks, P.AttachFiles],
    },
    ...staffRoles(guild).map((role) => ({
      id: role.id,
      allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks],
    })),
  ];

  const saved = store.get('ticketCategories', {});
  for (const type of TICKET_TYPES) {
    let category = getCategory(guild, type);
    if (category) {
      log(`Catégorie déjà là : ${category.name}`);
    } else {
      category = await guild.channels.create({
        name: type.category,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites,
      });
      log(`Catégorie créée : ${category.name}`);
    }
    saved[type.value] = category.id;
  }
  store.set('ticketCategories', saved);
}

// ---------------------------------------------------------------------------
// Panneau "Espace Tickets"
// ---------------------------------------------------------------------------

// Cherche des images dans assets/ : "miniature.png", "ticket-1.jpg"…
function localImage(name) {
  for (const ext of IMAGE_EXTENSIONS) {
    const file = path.join(ASSETS_DIR, `${name}.${ext}`);
    if (fs.existsSync(file)) return { file, name: `${name}.${ext}` };
  }
  return null;
}

function buildPanel() {
  const files = [];
  const use = (image) => {
    files.push(new AttachmentBuilder(image.file, { name: image.name }));
    return `attachment://${image.name}`;
  };

  const thumbnailImage = localImage('miniature');
  const thumbnail = thumbnailImage ? use(thumbnailImage) : env.ticketThumbnailUrl;

  const banners = [1, 2, 3, 4].map((n) => localImage(`ticket-${n}`)).filter(Boolean).map(use);
  if (!banners.length && env.ticketImageUrl) banners.push(env.ticketImageUrl);

  const heading = new TextDisplayBuilder().setContent(`## ${TICKET_PANEL.title}`);
  const body = new TextDisplayBuilder().setContent(TICKET_PANEL.text);

  const container = new ContainerBuilder().setAccentColor(TICKET_PANEL.color);
  if (thumbnail) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(heading, body)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)),
    );
  } else {
    container.addTextDisplayComponents(heading, body);
  }
  if (banners.length) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(banners.map((url) => new MediaGalleryItemBuilder().setURL(url))),
    );
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(OPEN_ID)
    .setPlaceholder(TICKET_PANEL.placeholder)
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
    components: [container, new ActionRowBuilder().addComponents(menu)],
    files,
  };
}

async function postPanel(channel, log = console.log) {
  await upsertPanel(channel, OPEN_ID, buildPanel(), 'Panneau des tickets', log);
}

// ---------------------------------------------------------------------------
// Dans un ticket : ouvrir, prendre en charge, renommer, fermer
// ---------------------------------------------------------------------------

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

// Quelqu'un a choisi PRESTATION, QUESTION ou REPORT dans le menu.
async function openTicket(interaction) {
  const type = TICKET_TYPES.find((t) => t.value === interaction.values[0]);
  const { guild, user } = interaction;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const marker = `ticket:${type.value}:${user.id}`;
  const already = guild.channels.cache.find((c) => c.topic === marker);
  if (already) return interaction.editReply(`Tu as déjà un ticket ${type.label} ouvert : ${already}`);

  const category = getCategory(guild, type);
  if (!category) return interaction.editReply('Les catégories de tickets n’existent pas, un admin doit taper /installer tickets.');

  // Mêmes droits que la catégorie + le staff + la personne qui ouvre le ticket.
  const overwrites = new Map();
  for (const o of category.permissionOverwrites.cache.values()) {
    overwrites.set(o.id, { id: o.id, type: o.type, allow: o.allow, deny: o.deny });
  }
  for (const role of staffRoles(guild)) {
    overwrites.set(role.id, {
      id: role.id,
      allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks],
    });
  }
  overwrites.set(user.id, {
    id: user.id,
    allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks],
  });

  const channel = await guild.channels.create({
    name: `${type.channelEmoji}-${type.value}-${user.username}`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: category.id,
    topic: marker,
    permissionOverwrites: [...overwrites.values()],
  });

  const staff = staffRoles(guild);
  const embed = new EmbedBuilder()
    .setColor(TICKET_PANEL.color)
    .setTitle(`${type.channelEmoji} Ticket ${type.label}`)
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

// Bouton "Prendre en charge" : réservé au staff.
async function claimTicket(interaction) {
  const { member } = interaction;
  if (!isStaff(member)) return ephemeral(interaction, 'Seul le staff peut prendre en charge un ticket.');
  await interaction.update({ components: [ticketButtons(member.displayName)] });
  await interaction.channel.send(`🙋 ${member} prend en charge ce ticket.`);
}

// Renomme un ticket en gardant l'emoji de son type devant.
async function renameTicket(interaction, newName) {
  const { channel } = interaction;
  const type = TICKET_TYPES.find((t) => t.value === channel.topic.split(':')[1]);
  const name = `${type ? `${type.channelEmoji}-` : ''}${newName}`.slice(0, 100);

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
  const current = channel.name.replace(/^\p{Extended_Pictographic}️?-/u, '');
  if (current) input.setValue(current.slice(0, 90));
  return new ModalBuilder()
    .setCustomId(RENAME_MODAL_ID)
    .setTitle('Renommer le ticket')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

// Bouton "Fermer le ticket" : la personne du ticket ou le staff.
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
  const id = interaction.customId;
  if (interaction.isStringSelectMenu() && id === OPEN_ID) {
    await openTicket(interaction);
  } else if (interaction.isButton() && id === CLOSE_ID) {
    await closeTicket(interaction);
  } else if (interaction.isButton() && id === CLAIM_ID) {
    await claimTicket(interaction);
  } else if (interaction.isButton() && id === RENAME_ID) {
    if (!isStaff(interaction.member)) await ephemeral(interaction, 'Seul le staff peut renommer un ticket.');
    else await interaction.showModal(renameModal(interaction.channel));
  } else if (interaction.isModalSubmit() && id === RENAME_MODAL_ID) {
    await renameTicket(interaction, interaction.fields.getTextInputValue('name'));
  } else {
    return false;
  }
  return true;
}

module.exports = { postPanel, buildPanel, ensureCategories, handleComponent, commands: [command] };
