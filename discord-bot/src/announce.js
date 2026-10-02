const {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits: P,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { PSEUDO } = require('./config');
const { findChannel } = require('./setup');

const MODAL_ID = 'announce:modal';

// Options choisies dans /annonce, en attendant que le formulaire soit envoyé.
const pending = new Map();

const command = {
  data: new SlashCommandBuilder()
    .setName('annonce')
    .setDescription('Publier une annonce (un formulaire s’ouvre pour écrire le texte)')
    .setDefaultMemberPermissions(P.ManageGuild)
    .addStringOption((o) =>
      o
        .setName('mention')
        .setDescription('Mentionner qui ? (aucune par défaut)')
        .addChoices(
          { name: '@everyone', value: 'everyone' },
          { name: '@here', value: 'here' },
          { name: 'Aucune', value: 'aucune' },
        ),
    )
    .addAttachmentOption((o) => o.setName('image').setDescription('Une image à mettre dans l’annonce'))
    .addChannelOption((o) =>
      o
        .setName('salon')
        .setDescription('Où publier (#annonces par défaut)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
  async execute(interaction) {
    const image = interaction.options.getAttachment('image');
    pending.set(interaction.user.id, {
      mention: interaction.options.getString('mention') || 'aucune',
      // Nom de fichier simple : "attachment://" ne supporte pas les espaces ou accents.
      image: image?.contentType?.startsWith('image/')
        ? { url: image.url, name: `annonce.${(image.name.match(/\.(png|jpe?g|gif|webp)$/i)?.[1] || 'png').toLowerCase()}` }
        : null,
      channelId: interaction.options.getChannel('salon')?.id,
    });

    const modal = new ModalBuilder()
      .setCustomId(MODAL_ID)
      .setTitle('Nouvelle annonce')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Titre (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(false),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('message')
            .setLabel('Message')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000),
        ),
      );
    await interaction.showModal(modal);
  },
};

async function handleComponent(interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== MODAL_ID) return false;

  const options = pending.get(interaction.user.id) || { mention: 'aucune' };
  pending.delete(interaction.user.id);

  const channel = options.channelId
    ? interaction.guild.channels.cache.get(options.channelId)
    : findChannel(interaction.guild, [ChannelType.GuildText, ChannelType.GuildAnnouncement], 'annonces');
  if (!channel) {
    await interaction.reply({ content: 'Salon #annonces introuvable.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const embed = new EmbedBuilder()
    .setColor(0xff6ec7)
    .setDescription(interaction.fields.getTextInputValue('message'))
    .setFooter({ text: `${PSEUDO} ♡` })
    .setTimestamp();
  const title = interaction.fields.getTextInputValue('title').trim();
  if (title) embed.setTitle(title);
  // L'image est re-téléversée avec l'annonce : le lien d'origine de Discord expire.
  const files = options.image ? [{ attachment: options.image.url, name: options.image.name }] : [];
  if (options.image) embed.setImage(`attachment://${options.image.name}`);

  const mention = { everyone: '@everyone', here: '@here' }[options.mention];
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await channel.send({
    content: mention,
    embeds: [embed],
    files,
    allowedMentions: { parse: mention ? ['everyone'] : [] },
  });
  await interaction.editReply(`Annonce publiée dans ${channel} ✅`);
  return true;
}

module.exports = { commands: [command], handleComponent };
