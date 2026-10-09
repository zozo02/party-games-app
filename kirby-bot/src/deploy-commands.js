const { REST, Routes } = require('discord.js');
const { env } = require('./config');
const { commands } = require('./commands');

if (!env.token || !env.clientId || !env.guildId) {
  console.error('❌ Remplis DISCORD_TOKEN, CLIENT_ID et GUILD_ID dans le fichier .env');
  process.exit(1);
}

const rest = new REST().setToken(env.token);

rest
  .put(Routes.applicationGuildCommands(env.clientId, env.guildId), {
    body: commands.map((c) => c.data.toJSON()),
  })
  .then((data) => console.log(`✅ ${data.length} commande(s) slash déployée(s) sur le serveur.`))
  .catch((err) => {
    console.error('❌ Erreur pendant le déploiement :', err);
    process.exit(1);
  });
