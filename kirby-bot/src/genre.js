const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { GENDERS } = require('./config');
const { findRoleByName, ephemeral, explainError } = require('./util');
const { upsertPanel } = require('./panels');
const store = require('./store');

const buttonId = (gender) => `genre:${gender.key}`;

// Retrouve le rôle d'un genre : ID du .env, sinon celui créé par /installer genre, sinon par son nom.
function getRole(guild, gender) {
  return (
    (gender.roleId && guild.roles.cache.get(gender.roleId)) ||
    guild.roles.cache.get(store.get('genreRoles', {})[gender.key]) ||
    findRoleByName(guild, gender.defaultName)
  );
}

// Crée seulement les rôles Homme / Femme qui n'existent pas encore.
async function ensureRoles(guild, log) {
  const saved = store.get('genreRoles', {});
  const roles = {};
  for (const gender of GENDERS) {
    let role = getRole(guild, gender);
    if (role) {
      log(`Rôle déjà là : ${role.name}`);
    } else {
      role = await guild.roles.create({
        name: gender.defaultName,
        color: gender.color,
        permissions: [],
        reason: 'Choix du genre',
      });
      log(`Rôle créé : ${role.name}`);
    }
    saved[gender.key] = role.id;
    roles[gender.key] = role;
  }
  store.set('genreRoles', saved);
  return roles;
}

function buildPanel(roles) {
  const lines = GENDERS.map((g) => `${g.emoji} **${g.label}** → ${roles[g.key]}`);
  const embed = new EmbedBuilder()
    .setColor(0xb388ff)
    .setTitle('👤 Sélectionne ton genre')
    .setDescription(
      [
        '> Bienvenue ! Pour personnaliser ton expérience sur le serveur,',
        '> dis-nous qui tu es en cliquant sur le bouton correspondant ci-dessous.',
        '',
        ...lines,
        '',
        '💡 **Bon à savoir**',
        '• Tu peux changer à tout moment en recliquant',
        '• Tu ne peux avoir qu’un seul des deux rôles à la fois',
        '• Le choix est uniquement visible par toi',
      ].join('\n'),
    )
    .setFooter({ text: 'Système de genre • Clique sur un bouton' })
    .setTimestamp();

  const buttons = GENDERS.map((g) =>
    new ButtonBuilder()
      .setCustomId(buttonId(g))
      .setLabel(g.label)
      .setEmoji(g.emoji)
      .setStyle(g.key === 'homme' ? ButtonStyle.Primary : ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(buttons)] };
}

async function postGenre(channel, log = console.log) {
  const roles = await ensureRoles(channel.guild, log);
  await upsertPanel(channel, buttonId(GENDERS[0]), buildPanel(roles), 'Choix du genre', log);
}

// Clic sur Homme / Femme : on donne ce rôle et on retire l'autre. Recliquer sur le même le retire.
async function handleComponent(interaction) {
  if (!interaction.isButton()) return false;
  const gender = GENDERS.find((g) => buttonId(g) === interaction.customId);
  if (!gender) return false;

  const { guild, member } = interaction;
  const role = getRole(guild, gender);
  const others = GENDERS.filter((g) => g !== gender).map((g) => getRole(guild, g)).filter(Boolean);
  if (!role) {
    await ephemeral(interaction, 'Ce rôle n’existe pas, préviens un admin (/installer genre).');
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, 'Choix du genre');
      await interaction.editReply(`Rôle ${role} retiré.`);
    } else {
      const toRemove = others.filter((r) => member.roles.cache.has(r.id));
      if (toRemove.length) await member.roles.remove(toRemove, 'Choix du genre');
      await member.roles.add(role, 'Choix du genre');
      await interaction.editReply(`Tu as maintenant le rôle ${role} ✅`);
    }
  } catch (err) {
    await interaction.editReply(`Je n’ai pas pu changer ton rôle : ${explainError(err)}`);
  }
  return true;
}

module.exports = { postGenre, handleComponent };
