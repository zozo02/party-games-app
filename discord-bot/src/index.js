const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { env } = require('./config');
const { setupGuild, findRole } = require('./setup');
const { commands } = require('./commands');
const { sendWelcome } = require('./welcome');
const { startGiveawayTimer } = require('./giveaways');

// Modules qui gèrent des boutons, menus et formulaires.
const componentHandlers = ['./tickets', './rules', './welcome', './announce', './giveaways'].map(
  (file) => require(file).handleComponent,
);

if (!env.token || !env.guildId) {
  console.error('❌ Remplis DISCORD_TOKEN et GUILD_ID dans le fichier .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
  startGiveawayTimer(c);
  if (!env.autoSetup) return;

  const guild = await c.guilds.fetch(env.guildId).catch(() => null);
  if (!guild) {
    console.error('❌ Le bot n’est pas sur le serveur GUILD_ID. Invite-le d’abord (voir README).');
    return;
  }

  // Configuration automatique uniquement au tout premier démarrage : si les rôles
  // existent déjà, on ne touche à rien (pour mettre à jour : /setup).
  await guild.roles.fetch();
  if (findRole(guild, 'fondateur')) {
    console.log('ℹ️ Serveur déjà configuré, rien n’est modifié. Tape /setup pour le mettre à jour.');
    return;
  }
  try {
    await setupGuild(guild);
  } catch (err) {
    console.error('❌ Erreur pendant la configuration :', err.message);
  }
});

// Nouveau membre : message de bienvenue. Le rôle Membre s'obtient en acceptant le règlement.
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot || member.guild.id !== env.guildId) return;
  await sendWelcome(member);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.find((c) => c.data.name === interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }
    for (const handle of componentHandlers) {
      if (await handle(interaction)) return;
    }
  } catch (err) {
    console.error('Erreur interaction :', err);
    const reply = { content: `❌ ${err.message}`, flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.followUp(reply).catch(() => null);
    else await interaction.reply(reply).catch(() => null);
  }
});

client.login(env.token);
