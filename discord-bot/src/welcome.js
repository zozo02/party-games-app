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
const store = require('./store');

const MODAL_ID = 'welcome:modal';

const DEFAULT_WELCOME = {
  title: `Bienvenue sur le serveur de ${PSEUDO} ♡`,
  message:
    'Coucou {membre} 💫\n\n' +
    'Pense à lire et accepter le {reglement} pour débloquer tout le serveur.\n\n' +
    'Tu es le membre n°**{nombre}** ✨',
  image: '',
};

const getWelcome = () => ({ ...DEFAULT_WELCOME, ...store.get('welcome', {}) });

// Remplace {membre}, {pseudo}, {serveur}, {nombre}, {reglement} dans un texte.
function fill(text, member) {
  const rules = findChannel(member.guild, [ChannelType.GuildText], 'règlement');
  return text
    .replaceAll('{membre}', `${member}`)
    .replaceAll('{pseudo}', member.displayName)
    .replaceAll('{serveur}', member.guild.name)
    .replaceAll('{nombre}', `${member.guild.memberCount}`)
    .replaceAll('{reglement}', rules ? `${rules}` : 'règlement');
}

function buildWelcome(member) {
  const welcome = getWelcome();
  const embed = new EmbedBuilder()
    .setColor(0xff6ec7)
    .setTitle(fill(welcome.title, member).slice(0, 256))
    .setDescription(fill(welcome.message, member))
    .setThumbnail(member.user.displayAvatarURL());
  if (welcome.image) embed.setImage(welcome.image);
  return { content: `${member}`, embeds: [embed], allowedMentions: { users: [member.id] } };
}

async function sendWelcome(member) {
  const channel = findChannel(member.guild, [ChannelType.GuildText], 'bienvenue');
  if (channel) await channel.send(buildWelcome(member)).catch(() => null);
}

const command = {
  data: new SlashCommandBuilder()
    .setName('bienvenue')
    .setDescription('Le message de bienvenue des nouveaux membres')
    .setDefaultMemberPermissions(P.ManageGuild)
    .addSubcommand((s) => s.setName('modifier').setDescription('Modifier le titre, le message et l’image de bienvenue'))
    .addSubcommand((s) => s.setName('test').setDescription('Voir le message de bienvenue (visible que par toi)'))
    .addSubcommand((s) => s.setName('reinitialiser').setDescription('Remettre le message de bienvenue par défaut')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'test') {
      const { embeds } = buildWelcome(interaction.member);
      return interaction.reply({ embeds, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'reinitialiser') {
      store.set('welcome', {});
      return interaction.reply({ content: 'Message de bienvenue remis par défaut ✅', flags: MessageFlags.Ephemeral });
    }

    const welcome = getWelcome();
    const input = (id, label, style, value, max, required = true) => {
      const field = new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style)
        .setMaxLength(max)
        .setRequired(required);
      if (value) field.setValue(value);
      return new ActionRowBuilder().addComponents(field);
    };
    const modal = new ModalBuilder()
      .setCustomId(MODAL_ID)
      .setTitle('Message de bienvenue')
      .addComponents(
        input('title', 'Titre', TextInputStyle.Short, welcome.title, 256),
        input('message', 'Message ({membre} {nombre} {reglement}…)', TextInputStyle.Paragraph, welcome.message, 4000),
        input('image', 'Lien d’une image (optionnel)', TextInputStyle.Short, welcome.image, 500, false),
      );
    return interaction.showModal(modal);
  },
};

async function handleComponent(interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== MODAL_ID) return false;

  const image = interaction.fields.getTextInputValue('image').trim();
  if (image && !/^https?:\/\//.test(image)) {
    await interaction.reply({ content: 'Le lien de l’image doit commencer par https://', flags: MessageFlags.Ephemeral });
    return true;
  }
  store.set('welcome', {
    title: interaction.fields.getTextInputValue('title'),
    message: interaction.fields.getTextInputValue('message'),
    image,
  });
  const { embeds } = buildWelcome(interaction.member);
  await interaction.reply({ content: 'Message de bienvenue enregistré ✅ Aperçu :', embeds, flags: MessageFlags.Ephemeral });
  return true;
}

module.exports = { commands: [command], handleComponent, sendWelcome };
