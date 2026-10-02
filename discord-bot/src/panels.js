// Poste un message "panneau" du bot dans un salon, ou met à jour celui qui y est
// déjà (reconnu grâce au customId d'un de ses boutons/menus) : jamais de doublon.
async function upsertPanel(channel, customId, payload, label, log = console.log) {
  const messages = await channel.messages.fetch({ limit: 50 });
  const existing = messages.find(
    (m) => m.author.id === channel.client.user.id && JSON.stringify(m.components).includes(customId),
  );
  if (existing) {
    await existing.edit({ ...payload, attachments: [] });
    log(`${label} mis à jour.`);
  } else {
    await channel.send(payload);
    log(`${label} posté.`);
  }
}

module.exports = { upsertPanel };
