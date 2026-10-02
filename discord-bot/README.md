# Bot Discord littledesire

Quand le bot démarre, il configure le serveur tout seul : rôles, catégories, salons, permissions, et il donne les rôles aux membres.
On peut le relancer autant de fois qu'on veut : il met à jour ce qui existe déjà et ne crée pas de doublons.

## 1. Créer le bot (une seule fois)

1. Va sur https://discord.com/developers/applications, clique sur **New Application**.
2. Dans l'onglet **Bot** :
   - clique sur **Reset Token** et copie le token (c'est `DISCORD_TOKEN`) ;
   - active **Server Members Intent** (il en a besoin pour donner les rôles et souhaiter la bienvenue).
3. Dans **General Information**, copie l'**Application ID** (c'est `CLIENT_ID`).
4. Invite le bot avec les droits Administrateur (remplace `CLIENT_ID` dans le lien) :
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=8`

## 2. Lancer le bot dans VS Code

```bash
cd discord-bot
cp .env.example .env      # puis remplis DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm install
npm run deploy            # enregistre les commandes slash sur le serveur
npm start                 # démarre le bot et configure le serveur
```

> Pour avoir le `GUILD_ID` : Paramètres Discord > Avancés > active le **Mode développeur**, puis clic droit sur le serveur > **Copier l'identifiant du serveur**.

Le token reste dans le fichier `.env` : ne le partage pas. Le fichier est déjà dans `.gitignore`, donc il ne sera jamais envoyé sur GitHub.

## Ce que le bot crée

**Rôles** (du plus haut au plus bas) :

| Rôle | Droits |
|---|---|
| Fondateur | Administrateur |
| littledesire ♡ | Administrateur |
| .⁺˖♡ Manager | Administrateur |
| ⏾˖.˚ Little Friends | Comme les clients, plus : créer des fils, partager l'écran en vocal, la soundboard, la voix prioritaire |
| ⋆˚✧ Little Client | Comme les membres, plus : liens avec aperçu, emojis et stickers externes, changer son pseudo, messages vocaux |
| Membre | Voir les salons, écrire là où c'est permis, réagir, envoyer des fichiers, rejoindre les vocaux |

**Salons** : les permissions sont mises sur chaque catégorie, puis chaque salon prend celles de sa catégorie.

| Catégorie | Salons | Qui peut écrire |
|---|---|---|
| ☾ • Accueil | bienvenue, annonces, règlement, boosts, giveaways | Personne (seulement les admins) |
| ✶ ·.˚ LITTLE UNIVERSE | previews 🔞, pack-speciaux (forum 🔞), tarifs, moyens-de-paiement, wishlist, avis | Personne, sauf **pack-speciaux** où tout le monde peut publier |
| ✧ • SUPPORT | tickets | Personne : on ouvre un ticket avec le menu |
| .✦. • Communauté | discussion, medias, vos-selfies, idees | Tout le monde |
| 💳 • Tickets Paiement | (les tickets « Paiement ») | Invisible sauf pour Fondateur, littledesire ♡ et Manager |
| ❓ • Tickets Questions | (les tickets « Question ») | Invisible sauf pour Fondateur, littledesire ♡ et Manager |

`previews` et `pack-speciaux` sont marqués **18+** : Discord demande aux gens de confirmer qu'ils sont majeurs avant d'y entrer.

**Attribution des rôles** :
- le propriétaire du serveur reçoit **Fondateur** ;
- les IDs mis dans `FONDATEUR_IDS`, `CREATRICE_IDS` et `MANAGER_IDS` dans le `.env` reçoivent leur rôle ;
- chaque nouveau membre reçoit **Membre** et un message de bienvenue dans #bienvenue ;
- les membres déjà présents qui n'ont aucun rôle reçoivent **Membre**.

## Tickets

Dans `#tickets`, le bot poste un panneau « Espace Ticket » : une bannière, le texte, l'avertissement et le menu **Fais un choix**.

- **Paiement** crée un salon `💳-paiement-pseudo` dans la catégorie **Tickets Paiement**.
- **Question** crée un salon `❓-question-pseudo` dans la catégorie **Tickets Questions**.
- Seuls la personne qui a ouvert le ticket et le staff (Fondateur, littledesire ♡, Manager) voient le salon. Le staff est mentionné à l'ouverture.
- On ne peut avoir qu'un seul ticket ouvert de chaque type.
- Le bouton **Fermer le ticket** supprime le salon. La personne du ticket ou le staff peuvent l'utiliser.

**Bannière** : mets ton image dans `assets/ticket.png` (ou `.jpg`, `.gif`, `.webp`), ou mets un lien dans `TICKET_IMAGE_URL` dans le `.env`. Sans image, le panneau affiche le titre « Espace Ticket » à la place.
Après un changement d'image ou de texte (les textes sont dans `TICKET_PANEL`, dans `src/config.js`), redémarre le bot ou tape `/setup` : le panneau est mis à jour, sans en poster un deuxième.

## Héberger le bot sur un VPS

Le bot prend environ 80 à 120 Mo de RAM. Il peut tourner sur le même VPS que d'autres bots, avec son propre token.

```bash
# envoie le dossier discord-bot sur le VPS (sans node_modules), puis :
cd discord-bot
npm install
npm run deploy
npm install -g pm2          # si pm2 n'est pas déjà installé
pm2 start src/index.js --name littledesire-bot
pm2 save                    # pour qu'il redémarre avec le VPS
```

Ensuite :
- `pm2 restart littledesire-bot` pour le redémarrer après une modification ;
- `pm2 logs littledesire-bot` pour voir ce qu'il affiche ;
- `pm2 monit` pour voir la RAM utilisée.

## Commandes slash

| Commande | Ce qu'elle fait |
|---|---|
| `/setup` | Relance toute la configuration (réservée aux admins) |
| `/client @membre` | Donne le rôle Little Client |
| `/friend @membre` | Donne le rôle Little Friends |

## Personnaliser

- Pseudo, nom du serveur : dans le `.env` (`PSEUDO`, `SERVER_NAME`).
- Noms, emojis, couleurs et droits des rôles et salons : dans `src/config.js`.

Après une modification, relance `npm start`, ou tape `/setup` sur Discord.

## Problèmes fréquents

- **« Le bot doit avoir la permission Administrateur »** : réinvite le bot avec le lien de l'étape 1.
- **Les rôles ne sont pas dans le bon ordre** : dans Paramètres du serveur > Rôles, glisse le rôle du bot tout en haut, puis tape `/setup`.
- **Erreur « Used disallowed intents »** : active **Server Members Intent** dans l'onglet Bot.
- **pack-speciaux est un salon texte et pas un forum** : Discord n'a pas autorisé la création d'un forum sur ce serveur. Active la Communauté dans les paramètres du serveur, supprime le salon, puis tape `/setup`.
