const { ChannelType, GuildSystemChannelFlags, PermissionFlagsBits: P } = require('discord.js');
const { env, ROLES, CATEGORIES, READ_ONLY_DENY, STAFF_ROLES } = require('./config');

// "💫 • Bienvenue •" -> "bienvenue" : permet de retrouver un salon même si
// Discord a modifié les espaces/emojis, pour ne jamais créer de doublon.
const norm = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const findRole = (guild, key) => {
  const def = ROLES.find((r) => r.key === key);
  return def && guild.roles.cache.find((r) => r.name === def.name);
};

const findChannel = (guild, types, name) =>
  guild.channels.cache.find((c) => types.includes(c.type) && norm(c.name) === norm(name));

async function setupRoles(guild, log) {
  const roles = {};
  for (const def of ROLES) {
    const data = {
      name: def.name,
      colors: { primaryColor: def.color },
      hoist: def.hoist,
      permissions: def.permissions,
      mentionable: false,
      reason: 'Configuration automatique du serveur',
    };
    const existing = guild.roles.cache.find((r) => r.name === def.name);
    if (existing) {
      roles[def.key] = await existing.edit(data);
      log(`Rôle mis à jour : ${def.name}`);
    } else {
      roles[def.key] = await guild.roles.create(data);
      log(`Rôle créé : ${def.name}`);
    }
  }

  // Ordre : Fondateur tout en haut, Membre tout en bas, juste sous le rôle du bot.
  const me = await guild.members.fetchMe();
  const top = me.roles.highest.position - 1;
  try {
    await guild.roles.setPositions(
      ROLES.map((def, i) => ({ role: roles[def.key].id, position: Math.max(1, top - i) })),
    );
  } catch (err) {
    log(`⚠️ Impossible de trier les rôles (${err.message}). Glisse le rôle du bot tout en haut puis relance /setup.`);
  }
  return roles;
}

async function setupChannels(guild, roles, log) {
  const everyone = guild.roles.everyone.id;
  const readOnly = [{ id: everyone, deny: READ_ONLY_DENY }];
  const staffOnly = [
    { id: everyone, deny: [P.ViewChannel] },
    ...STAFF_ROLES.map((key) => ({
      id: roles[key].id,
      allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks],
    })),
  ];
  const positions = [];
  const created = {};

  for (const [catIndex, cat] of CATEGORIES.entries()) {
    let category = findChannel(guild, [ChannelType.GuildCategory], cat.name);
    const overwrites = cat.staffOnly ? staffOnly : cat.readOnly ? readOnly : [];
    if (category) {
      await category.permissionOverwrites.set(overwrites);
      log(`Catégorie mise à jour : ${cat.name}`);
    } else {
      category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites,
      });
      log(`Catégorie créée : ${cat.name}`);
    }
    positions.push({ channel: category.id, position: catIndex });

    for (const [chIndex, def] of cat.channels.entries()) {
      const types = [def.type, ChannelType.GuildText];
      let ch = findChannel(guild, types, def.slug);
      const options = { topic: def.topic, nsfw: Boolean(def.nsfw), parent: category.id };

      if (ch) {
        await ch.edit(options);
        log(`Salon mis à jour : ${ch.name}`);
      } else {
        try {
          ch = await guild.channels.create({ name: def.name, type: def.type, ...options });
        } catch (err) {
          if (def.type !== ChannelType.GuildForum) throw err;
          // Les forums demandent parfois un serveur "Communauté" : on retombe sur un salon texte.
          log(`⚠️ Forum impossible pour ${def.slug} (${err.message}), création d'un salon texte.`);
          ch = await guild.channels.create({ name: def.name, type: ChannelType.GuildText, ...options });
        }
        log(`Salon créé : ${ch.name}`);
      }

      if (def.writable && cat.readOnly) {
        // Exception à la catégorie lecture seule (ex : le forum pack-speciaux).
        await ch.permissionOverwrites.set([
          {
            id: everyone,
            allow: [P.SendMessages, P.SendMessagesInThreads],
            deny: [P.CreatePrivateThreads],
          },
        ]);
      } else {
        await ch.lockPermissions();
      }

      positions.push({ channel: ch.id, position: chIndex, parent: category.id });
      created[def.slug] = ch;
    }
  }

  try {
    await guild.channels.setPositions(positions);
  } catch (err) {
    log(`⚠️ Impossible de trier les salons : ${err.message}`);
  }
  return created;
}

async function assignRoles(guild, roles, log) {
  const give = async (userId, role) => {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return log(`⚠️ Membre introuvable : ${userId}`);
    if (member.roles.cache.has(role.id)) return;
    await member.roles.add(role).catch((err) => log(`⚠️ ${member.user.tag} : ${err.message}`));
    log(`${role.name} donné à ${member.user.tag}`);
  };

  await give(guild.ownerId, roles.fondateur);
  for (const id of env.fondateurIds) await give(id, roles.fondateur);
  for (const id of env.creatriceIds) await give(id, roles.creatrice);
  for (const id of env.managerIds) await give(id, roles.manager);

  // Tous les humains qui n'ont encore aucun rôle du serveur reçoivent "Membre".
  let members;
  try {
    members = await guild.members.fetch();
  } catch (err) {
    return log(`⚠️ Impossible de lister les membres (active "Server Members Intent") : ${err.message}`);
  }
  const ourRoleIds = Object.values(roles).map((r) => r.id);
  let count = 0;
  for (const member of members.values()) {
    if (member.user.bot || member.roles.cache.some((r) => ourRoleIds.includes(r.id))) continue;
    await member.roles.add(roles.membre).catch(() => null);
    count++;
  }
  if (count) log(`Rôle Membre donné à ${count} membre(s).`);
}

async function setupGuild(guild, log = console.log) {
  const me = await guild.members.fetchMe();
  if (!me.permissions.has(P.Administrator)) {
    throw new Error('Le bot doit avoir la permission Administrateur sur le serveur.');
  }

  if (env.serverName && guild.name !== env.serverName) {
    await guild.setName(env.serverName);
    log(`Serveur renommé en ${env.serverName}`);
  }

  // Permissions de base de @everyone (les salons lecture seule les restreignent ensuite).
  await guild.roles.everyone.setPermissions(ROLES.find((r) => r.key === 'membre').permissions);

  const roles = await setupRoles(guild, log);
  const channels = await setupChannels(guild, roles, log);

  // Les messages de boost arrivent dans #boosts, l'accueil est géré par le bot dans #bienvenue.
  if (channels.boosts) {
    await guild.edit({
      systemChannel: channels.boosts,
      systemChannelFlags:
        GuildSystemChannelFlags.SuppressJoinNotifications |
        GuildSystemChannelFlags.SuppressJoinNotificationReplies |
        GuildSystemChannelFlags.SuppressGuildReminderNotifications,
    });
  }

  if (channels.tickets) {
    // Chargé ici pour éviter une dépendance circulaire (tickets.js utilise setup.js).
    await require('./tickets').postPanel(channels.tickets, log);
  }

  await assignRoles(guild, roles, log);
  log('✅ Configuration terminée.');
}

module.exports = { setupGuild, findRole, findChannel };
