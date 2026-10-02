const { SlashCommandBuilder, PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const { setupGuild, findRole } = require('./setup');

const giveRoleCommand = (name, roleKey, description) => ({
  data: new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(P.ManageRoles)
    .addUserOption((o) => o.setName('membre').setDescription('La personne').setRequired(true)),
  async execute(interaction) {
    const role = findRole(interaction.guild, roleKey);
    if (!role) {
      return interaction.reply({ content: 'Rôle introuvable, lance /setup d’abord.', flags: MessageFlags.Ephemeral });
    }
    const member = await interaction.guild.members.fetch(interaction.options.getUser('membre').id);
    await member.roles.add(role);
    await interaction.reply({ content: `${member} a reçu le rôle **${role.name}** ♡`, flags: MessageFlags.Ephemeral });
  },
});

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Crée / met à jour les rôles, salons et permissions du serveur')
      .setDefaultMemberPermissions(P.Administrator),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const lines = [];
      try {
        await setupGuild(interaction.guild, (line) => lines.push(line));
      } catch (err) {
        lines.push(`❌ ${err.message}`);
      }
      const text = lines.join('\n');
      await interaction.editReply(text.length > 1900 ? `${text.slice(0, 1900)}\n…` : text);
    },
  },
  giveRoleCommand('client', 'clients', 'Donne le rôle Client à un membre'),
  giveRoleCommand('friend', 'friends', 'Donne le rôle Friends à un membre'),
];

module.exports = { commands };
