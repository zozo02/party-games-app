const { ChannelType, MessageFlags, PermissionFlagsBits: P, SlashCommandBuilder } = require('discord.js');
const tickets = require('./tickets');
const rules = require('./rules');
const genre = require('./genre');
const { explainError } = require('./util');

// /installer tickets | reglement | genre [salon]
// Poste (ou met à jour, sans doublon) le panneau dans le salon choisi. Ne crée aucun salon.
const installer = {
  data: new SlashCommandBuilder()
    .setName('installer')
    .setDescription('Installer un panneau dans un salon (tickets, règlement, genre)')
    .setDefaultMemberPermissions(P.Administrator)
    .addSubcommand((s) => withChannel(s.setName('tickets').setDescription('Le panneau des tickets (crée les 3 catégories si besoin)')))
    .addSubcommand((s) => withChannel(s.setName('reglement').setDescription('Le règlement avec le bouton pour l’accepter')))
    .addSubcommand((s) => withChannel(s.setName('genre').setDescription('Le choix Homme / Femme (crée les rôles s’ils n’existent pas)'))),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = interaction.options.getChannel('salon') || interaction.channel;
    const lines = [];
    const log = (line) => lines.push(line);

    try {
      switch (interaction.options.getSubcommand()) {
        case 'tickets':
          await tickets.ensureCategories(interaction.guild, log);
          await tickets.postPanel(channel, log);
          break;
        case 'reglement':
          await rules.postRules(channel, log);
          break;
        case 'genre':
          await genre.postGenre(channel, log);
          break;
      }
      lines.push(`✅ Terminé dans ${channel}.`);
    } catch (err) {
      lines.push(`❌ ${explainError(err)}`);
    }
    await interaction.editReply(lines.join('\n').slice(0, 1900));
  },
};

function withChannel(subcommand) {
  return subcommand.addChannelOption((o) =>
    o
      .setName('salon')
      .setDescription('Où poster le panneau (le salon actuel par défaut)')
      .addChannelTypes(ChannelType.GuildText),
  );
}

const commands = [installer, ...tickets.commands];

module.exports = { commands };
