# Bot Discord littledesire

Au **premier** démarrage, le bot configure le serveur tout seul : rôles, catégories, salons, permissions, règlement et panneau des tickets.
Aux démarrages suivants, il ne touche à rien. Pour mettre le serveur à jour, tape `/setup` : il modifie ce qui existe déjà et ne crée jamais de doublons.

## 1. Créer le bot (une seule fois)

1. Va sur https://discord.com/developers/applications, clique sur **New Application**.
2. Dans l'onglet **Bot** :
   - clique sur **Reset Token** et copie le token (c'est `DISCORD_TOKEN`) ;
   - active **Server Members Intent** (il en a besoin pour donner les rôles et souhaiter la bienvenue).
3. Dans **General Information**, copie l'**Application ID** (c'est `CLIENT_ID`).
4. Invite le bot avec les droits Administrateur (remplace `CLIENT_ID` dans le lien) :
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=8`

## 2. Installer le bot (une seule fois)

Le plus simple est de récupérer le code avec **git** : ensuite, une seule commande suffit pour avoir chaque nouvelle version, et ton `.env` n'est jamais touché.

```bash
git clone -b claude/friendly-mccarthy-chqh2l https://github.com/zozo02/party-games-app.git
cd party-games-app/discord-bot
cp .env.example .env      # puis remplis DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm install
npm run deploy            # enregistre les commandes slash sur le serveur
npm start                 # démarre le bot
```

## 3. Mettre à jour le bot

Dans le dossier `discord-bot` :

```bash
npm run update            # récupère la nouvelle version + installe + met à jour les commandes slash
```

Puis redémarre le bot (`Ctrl+C` puis `npm start`, ou `pm2 restart littledesire-bot` sur le VPS).
Ton `.env` et le dossier `data/` (message de bienvenue, giveaways en cours) ne sont jamais écrasés.

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
| Membre | Voir les salons, écrire là où c'est permis, réagir, envoyer des fichiers, rejoindre les vocaux. S'obtient en acceptant le règlement |

**Salons** : les permissions sont mises sur chaque catégorie, puis chaque salon prend celles de sa catégorie.

| Catégorie | Salons | Qui peut écrire |
|---|---|---|
| ☾ • Accueil | bienvenue, annonces, règlement, boosts, giveaways | Personne (seulement les admins). **Seule catégorie visible avant d'avoir accepté le règlement** |
| ✶ ·.˚ LITTLE UNIVERSE | previews 🔞, pack-speciaux (forum 🔞), tarifs, moyens-de-paiement, wishlist, avis | Personne, sauf **pack-speciaux** où tout le monde peut publier |
| ✧ • SUPPORT | tickets | Personne : on ouvre un ticket avec le menu |
| .✦. • Communauté | discussion, medias, vos-selfies, idees | Tout le monde |
| 💳 • Tickets Paiement | (les tickets « Paiement ») | Invisible sauf pour Fondateur, littledesire ♡ et Manager |
| ❓ • Tickets Questions | (les tickets « Question ») | Invisible sauf pour Fondateur, littledesire ♡ et Manager |

`previews` et `pack-speciaux` sont marqués **18+** : Discord demande aux gens de confirmer qu'ils sont majeurs avant d'y entrer.

**Attribution des rôles** :
- le propriétaire du serveur reçoit **Fondateur** ;
- les IDs mis dans `FONDATEUR_IDS`, `CREATRICE_IDS` et `MANAGER_IDS` dans le `.env` reçoivent leur rôle ;
- chaque nouveau membre reçoit un message de bienvenue dans #bienvenue ;
- le rôle **Membre** (accès à tout le serveur) s'obtient en cliquant sur **J'accepte le règlement**.

## Règlement

Dans `#règlement`, le bot poste le règlement avec un bouton **✅ J'accepte le règlement**. Tant qu'une personne n'a pas cliqué, elle ne voit que la catégorie Accueil. En cliquant, elle reçoit le rôle Membre et voit tout le serveur.

Le texte est dans `textes/reglement.md`. Écrire `#tickets` ou `#moyens-de-paiement` dans ce fichier crée un lien cliquable vers le salon. Après une modification, tape `/setup` : le message est mis à jour, sans en poster un deuxième.

## Message de bienvenue

- `/bienvenue modifier` ouvre un formulaire déjà rempli : titre, message, et lien d'une image (optionnel).
- `/bienvenue test` montre le message (visible seulement par toi).
- `/bienvenue reinitialiser` remet le message par défaut.

Dans le titre et le message, tu peux écrire : `{membre}` (mentionne la personne), `{pseudo}` (son pseudo), `{serveur}` (nom du serveur), `{nombre}` (nombre de membres), `{reglement}` (lien vers #règlement).

## Annonces

`/annonce` ouvre un formulaire pour écrire le titre et le message (retours à la ligne possibles). Options de la commande :
- `mention` : @everyone, @here ou aucune ;
- `image` : une image à mettre dans l'annonce ;
- `salon` : où publier (#annonces par défaut).

## Giveaways

- `/giveaway lancer prix: duree: [gagnants:] [description:] [salon:]` : la durée s'écrit `30m`, `2h`, `1j`, `1j12h`… Le giveaway est publié dans #giveaways avec un bouton **🎉 Participer** (on reclique pour se retirer).
- À la fin, le bot tire au sort les gagnants et les annonce. Ça marche même si le bot a redémarré entre-temps.
- `/giveaway terminer message_id:` termine un giveaway tout de suite.
- `/giveaway reroll message_id:` tire au sort de nouveaux gagnants.

Pour avoir le `message_id` : clic droit sur le message du giveaway > **Copier l'identifiant du message**.

## Tickets

Dans `#tickets`, le bot poste un panneau « Espace Ticket » : une bannière, le texte, l'avertissement et le menu **Fais un choix**.

- **Paiement** crée un salon `💳-paiement-pseudo` dans la catégorie **Tickets Paiement**.
- **Question** crée un salon `❓-question-pseudo` dans la catégorie **Tickets Questions**.
- Seuls la personne qui a ouvert le ticket et le staff (Fondateur, littledesire ♡, Manager) voient le salon. Le staff est mentionné à l'ouverture.
- On ne peut avoir qu'un seul ticket ouvert de chaque type.
- Sous le message d'ouverture, il y a 3 boutons :
  - **🙋 Prendre en charge** (staff) : le bouton affiche qui s'occupe du ticket ;
  - **✏️ Renommer** (staff) : ouvre un formulaire pour changer le nom du ticket. `/ticket renommer nom:` fait pareil ;
  - **🔒 Fermer le ticket** : supprime le salon. La personne du ticket ou le staff peuvent l'utiliser.
- Discord limite les renommages à 2 toutes les 10 minutes par salon.

**Bannière** : mets ton image dans `assets/ticket.png` (ou `.jpg`, `.gif`, `.webp`), ou mets un lien dans `TICKET_IMAGE_URL` dans le `.env`. Sans image, le panneau affiche le titre « Espace Ticket » à la place.
Après un changement d'image ou de texte (les textes sont dans `TICKET_PANEL`, dans `src/config.js`), tape `/setup` : le panneau est mis à jour, sans en poster un deuxième.

## Héberger le bot sur un VPS

Le bot prend environ 80 à 120 Mo de RAM. Il peut tourner sur le même VPS que d'autres bots, avec son propre token.

```bash
git clone -b claude/friendly-mccarthy-chqh2l https://github.com/zozo02/party-games-app.git
cd party-games-app/discord-bot
nano .env                   # colle le contenu de ton .env
npm install
npm run deploy
npm install -g pm2          # si pm2 n'est pas déjà installé
pm2 start src/index.js --name littledesire-bot
pm2 save                    # pour qu'il redémarre avec le VPS
```

Ensuite :
- `npm run update` puis `pm2 restart littledesire-bot` pour passer à une nouvelle version ;
- `pm2 logs littledesire-bot` pour voir ce qu'il affiche ;
- `pm2 monit` pour voir la RAM utilisée.

## Commandes slash

| Commande | Ce qu'elle fait |
|---|---|
| `/setup` | Relance toute la configuration (réservée aux admins) |
| `/client @membre` | Donne le rôle Little Client |
| `/friend @membre` | Donne le rôle Little Friends |
| `/bienvenue modifier` / `test` / `reinitialiser` | Gérer le message de bienvenue |
| `/annonce` | Publier une annonce |
| `/giveaway lancer` / `terminer` / `reroll` | Gérer les giveaways |
| `/ticket renommer` | Renommer le ticket actuel |

## Personnaliser

- Pseudo, nom du serveur : dans le `.env` (`PSEUDO`, `SERVER_NAME`).
- Noms, emojis, couleurs et droits des rôles et salons : dans `src/config.js`.
- Texte du règlement : dans `textes/reglement.md`.

Après une modification, redémarre le bot pour charger le nouveau code, puis tape `/setup` sur Discord pour l'appliquer au serveur.

## Problèmes fréquents

- **« Le bot doit avoir la permission Administrateur »** : réinvite le bot avec le lien de l'étape 1.
- **Les rôles ne sont pas dans le bon ordre** : dans Paramètres du serveur > Rôles, glisse le rôle du bot tout en haut, puis tape `/setup`.
- **Erreur « Used disallowed intents »** : active **Server Members Intent** dans l'onglet Bot.
- **pack-speciaux est un salon texte et pas un forum** : Discord n'a pas autorisé la création d'un forum sur ce serveur. Active la Communauté dans les paramètres du serveur, supprime le salon, puis tape `/setup`.
