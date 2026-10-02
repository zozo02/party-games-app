const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits: P,
  SlashCommandBuilder,
} = require('discord.js');
const { findChannel } = require('./setup');
const store = require('./store');

const JOIN_ID = 'giveaway:join';
const COLOR = 0xff6ec7;
const UNITS = { j: 86_400_000, d: 86_400_000, h: 3_600_000, m: 60_000, min: 60_000, s: 1000 };

// "1j12h", "2h", "30m", "45min" -> millisecondes (0 si invalide).
function parseDuration(text) {
  const clean = text.toLowerCase().replace(/\s+/g, '');
  const parts = [...clean.matchAll(/(\d+)(min|j|d|h|m|s)/g)];
  if (!parts.length || parts.map((p) => p[0]).join('') !== clean) return 0;
  return parts.reduce((total, [, n, unit]) => total + Number(n) * UNITS[unit], 0);
}

const all = () => store.get('giveaways', {});
const save = (giveaways) => store.set('giveaways', giveaways);

function pickWinners(ids, count) {
  const pool = [...ids];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function buildMessage(gw) {
  const end = Math.floor(gw.endsAt / 1000);
  const lines = [`## ${gw.prize}`];
  if (gw.description) lines.push(gw.description, '');
  if (gw.ended) {
    lines.push(
      gw.winnerIds.length
        ? `🏆 **Gagnant(s) :** ${gw.winnerIds.map((id) => `<@${id}>`).join(', ')}`
        : '😢 Personne n’a participé.',
      `⏰ Terminé <t:${end}:R>`,
    );
  } else {
    lines.push(`⏰ **Fin :** <t:${end}:R> (<t:${end}:f>)`, `🏆 **Gagnant(s) :** ${gw.winners}`, '', 'Clique sur 🎉 pour participer !');
  }
  lines.push(`👤 Organisé par <@${gw.hostId}>`);

  const embed = new EmbedBuilder()
    .setColor(gw.ended ? 0x555555 : COLOR)
    .setTitle(gw.ended ? '🎁 GIVEAWAY TERMINÉ' : '🎁 GIVEAWAY')
    .setDescription(lines.join('\n'));
  const button = new ButtonBuilder()
    .setCustomId(JOIN_ID)
    .setEmoji('🎉')
    .setLabel(`Participer (${gw.participants.length})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(Boolean(gw.ended));
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] };
}

async function fetchMessage(client, gw, messageId) {
  const channel = await client.channels.fetch(gw.channelId).catch(() => null);
  const message = channel && (await channel.messages.fetch(messageId).catch(() => null));
  return { channel, message };
}

function announceWinners(channel, gw, winnerIds, reroll = false) {
  if (!winnerIds.length) return channel.send(`😢 Pas assez de participants pour **${gw.prize}**.`);
  const mentions = winnerIds.map((id) => `<@${id}>`).join(', ');
  const tickets = findChannel(channel.guild, [ChannelType.GuildText], 'tickets');
  return channel.send({
    content:
      `🎉 ${reroll ? 'Nouveau tirage ! ' : ''}Félicitations ${mentions} ! Tu gagnes **${gw.prize}** ♡\n` +
      `Ouvre un ticket dans ${tickets || '#tickets'} pour récupérer ton gain.`,
    allowedMentions: { users: winnerIds },
  });
}

async function endGiveaway(client, messageId) {
  const giveaways = all();
  const gw = giveaways[messageId];
  if (!gw || gw.ended) return null;

  gw.ended = true;
  gw.endsAt = Math.min(gw.endsAt, Date.now());
  gw.winnerIds = pickWinners(gw.participants, gw.winners);
  save(giveaways);

  const { channel, message } = await fetchMessage(client, gw, messageId);
  if (message) await message.edit(buildMessage(gw)).catch(() => null);
  if (channel) await announceWinners(channel, gw, gw.winnerIds).catch(() => null);
  return gw;
}

// Vérifie toutes les 15 secondes si un giveaway est terminé (survit aux redémarrages).
function startGiveawayTimer(client) {
  setInterval(() => {
    for (const [id, gw] of Object.entries(all())) {
      if (!gw.ended && gw.endsAt <= Date.now()) endGiveaway(client, id).catch((err) => console.error('Giveaway :', err));
    }
  }, 15_000);
}

const command = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gérer les giveaways')
    .setDefaultMemberPermissions(P.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('lancer')
        .setDescription('Lancer un giveaway')
        .addStringOption((o) => o.setName('prix').setDescription('Ce qu’on gagne').setRequired(true).setMaxLength(200))
        .addStringOption((o) =>
          o.setName('duree').setDescription('Durée : 30m, 2h, 1j, 1j12h…').setRequired(true).setMaxLength(20),
        )
        .addIntegerOption((o) =>
          o.setName('gagnants').setDescription('Nombre de gagnants (1 par défaut)').setMinValue(1).setMaxValue(20),
        )
        .addStringOption((o) => o.setName('description').setDescription('Détails / conditions').setMaxLength(1000))
        .addChannelOption((o) =>
          o
            .setName('salon')
            .setDescription('Où publier (#giveaways par défaut)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('terminer')
        .setDescription('Terminer un giveaway maintenant')
        .addStringOption((o) => o.setName('message_id').setDescription('ID du message du giveaway').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('reroll')
        .setDescription('Retirer au sort de nouveaux gagnants')
        .addStringOption((o) => o.setName('message_id').setDescription('ID du message du giveaway').setRequired(true)),
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

    if (sub === 'lancer') {
      const duration = parseDuration(interaction.options.getString('duree'));
      if (!duration || duration > 60 * UNITS.j) return reply('Durée invalide. Exemples : `30m`, `2h`, `1j`, `1j12h` (60 jours max).');

      const channel =
        interaction.options.getChannel('salon') ||
        findChannel(interaction.guild, [ChannelType.GuildText, ChannelType.GuildAnnouncement], 'giveaways');
      if (!channel) return reply('Salon #giveaways introuvable.');

      const gw = {
        channelId: channel.id,
        prize: interaction.options.getString('prix'),
        description: interaction.options.getString('description') || '',
        winners: interaction.options.getInteger('gagnants') || 1,
        endsAt: Date.now() + duration,
        hostId: interaction.user.id,
        participants: [],
        winnerIds: [],
        ended: false,
      };
      const message = await channel.send(buildMessage(gw));
      save({ ...all(), [message.id]: gw });
      return reply(`Giveaway lancé dans ${channel} ✅ (ID : \`${message.id}\`)`);
    }

    const messageId = interaction.options.getString('message_id').trim();
    const giveaways = all();
    const gw = giveaways[messageId];
    if (!gw) return reply('Giveaway introuvable. Fais clic droit sur le message du giveaway > Copier l’identifiant du message.');

    if (sub === 'terminer') {
      if (gw.ended) return reply('Ce giveaway est déjà terminé.');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await endGiveaway(interaction.client, messageId);
      return interaction.editReply('Giveaway terminé ✅');
    }

    // reroll : nouveaux gagnants parmi les participants qui n'ont pas encore gagné.
    if (!gw.ended) return reply('Ce giveaway n’est pas encore terminé.');
    const remaining = gw.participants.filter((id) => !gw.winnerIds.includes(id));
    const winners = pickWinners(remaining, gw.winners);
    if (!winners.length) return reply('Plus aucun participant disponible pour un nouveau tirage.');
    gw.winnerIds = [...gw.winnerIds, ...winners];
    save(giveaways);
    const { channel } = await fetchMessage(interaction.client, gw, messageId);
    if (channel) await announceWinners(channel, gw, winners, true);
    return reply('Nouveau tirage effectué ✅');
  },
};

// Clic sur "🎉 Participer" : rejoindre, ou quitter si on participe déjà.
async function handleComponent(interaction) {
  if (!interaction.isButton() || interaction.customId !== JOIN_ID) return false;

  const giveaways = all();
  const gw = giveaways[interaction.message.id];
  if (!gw || gw.ended) {
    await interaction.reply({ content: 'Ce giveaway est terminé.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const userId = interaction.user.id;
  const joined = !gw.participants.includes(userId);
  gw.participants = joined ? [...gw.participants, userId] : gw.participants.filter((id) => id !== userId);
  save(giveaways);

  await interaction.update(buildMessage(gw));
  await interaction.followUp({
    content: joined ? 'Tu participes au giveaway 🎉 Bonne chance !' : 'Tu ne participes plus au giveaway.',
    flags: MessageFlags.Ephemeral,
  });
  return true;
}

module.exports = { commands: [command], handleComponent, startGiveawayTimer, parseDuration };
