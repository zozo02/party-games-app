const { Client, Events, GatewayIntentBits, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const { env, PSEUDO } = require('./config');
const { setupGuild, findRole, findChannel } = require('./setup');
const { commands } = require('./commands');
const { handleTicketInteraction } = require('./tickets');

if (!env.token || !env.guildId) {
  console.error('❌ Remplis DISCORD_TOKEN et GUILD_ID dans le fichier .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
  if (!env.autoSetup) return;

  const guild = await c.guilds.fetch(env.guildId).catch(() => null);
  if (!guild) {
    console.error('❌ Le bot n’est pas sur le serveur GUILD_ID. Invite-le d’abord (voir README).');
    return;
  }
  try {
    await setupGuild(guild);
  } catch (err) {
    console.error('❌ Erreur pendant la configuration :', err.message);
  }
});

// Nouveau membre : rôle Membre + message de bienvenue.
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot || member.guild.id !== env.guildId) return;

  const role = findRole(member.guild, 'membre');
  if (role) await member.roles.add(role).catch((err) => console.error('Rôle Membre :', err.message));

  const welcome = findChannel(member.guild, [ChannelType.GuildText], 'bienvenue');
  const rules = findChannel(member.guild, [ChannelType.GuildText], 'règlement');
  if (!welcome) return;

  const embed = new EmbedBuilder()
    .setColor(0xff6ec7)
    .setTitle(`Bienvenue dans l’univers de ${PSEUDO} ♡`)
    .setDescription(
      `Coucou ${member} 💫\n\n` +
        (rules ? `Pense à lire le ${rules} avant tout.\n` : '') +
        `Tu es le membre n°**${member.guild.memberCount}**.`,
    )
    .setThumbnail(member.user.displayAvatarURL());
  await welcome.send({ content: `${member}`, embeds: [embed] }).catch(() => null);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (await handleTicketInteraction(interaction)) return;
    if (!interaction.isChatInputCommand()) return;
    const command = commands.find((c) => c.data.name === interaction.commandName);
    if (command) await command.execute(interaction);
  } catch (err) {
    console.error('Erreur interaction :', err);
    const reply = { content: `❌ ${err.message}`, flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.followUp(reply).catch(() => null);
    else await interaction.reply(reply).catch(() => null);
  }
});

client.login(env.token);
