const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { env } = require('./config');
const { commands } = require('./commands');

// Modules qui gèrent des boutons, menus et formulaires.
const componentHandlers = ['./tickets', './rules', './genre'].map((file) => require(file).handleComponent);

if (!env.token || !env.guildId) {
  console.error('❌ Remplis DISCORD_TOKEN et GUILD_ID dans le fichier .env');
  process.exit(1);
}

// Pas besoin d'intents privilégiés : le bot ne lit ni les messages ni la liste des membres.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
  const guild = await c.guilds.fetch(env.guildId).catch(() => null);
  if (!guild) {
    console.error('❌ Le bot n’est pas sur le serveur GUILD_ID. Invite-le d’abord (voir README).');
    return;
  }
  if (!env.staffRoleIds.length) {
    console.warn('⚠️ STAFF_ROLE_IDS est vide : seuls les admins verront les tickets.');
  }
  console.log(`ℹ️ Serveur : ${guild.name}. Ce bot ne crée ni salons ni rôles au démarrage.`);
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
