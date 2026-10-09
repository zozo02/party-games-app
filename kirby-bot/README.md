# Bot Discord Kirby World

Le bot ne crée **aucun** salon ni rôle tout seul au démarrage. Il fait 3 choses :
- les **tickets** (menu PRESTATION / QUESTION / REPORT, chaque type dans sa propre catégorie) ;
- le **règlement** avec un bouton pour l'accepter (donne le rôle Membre) ;
- le **choix du genre** (boutons Homme / Femme).

C'est une copie du bot littledesire (dossier `discord-bot/`), qui reste inchangé.

## 1. Créer le bot (une seule fois)

Ce bot doit avoir **son propre token** : crée une nouvelle application, ne réutilise pas celle de littledesire.

1. https://discord.com/developers/applications > **New Application** (par exemple « Kirby World - Utils »).
2. Onglet **Bot** : **Reset Token** et copie le token (c'est `DISCORD_TOKEN`). Ce bot n'a besoin d'aucun « Intent » : rien à activer.
3. **General Information** : copie l'**Application ID** (c'est `CLIENT_ID`).
4. Invite-le sur le serveur (remplace `CLIENT_ID`) :
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=8`
5. Dans **Paramètres du serveur > Rôles**, glisse le rôle du bot **au-dessus** des rôles Membre, Homme et Femme, sinon il ne pourra pas les donner.

## 2. Installer

```bash
git clone -b claude/friendly-mccarthy-chqh2l https://github.com/zozo02/party-games-app.git
cd party-games-app/kirby-bot
cp .env.example .env      # puis remplis le .env (voir plus bas)
npm install
npm run deploy            # enregistre les commandes slash
npm start
```

Si tu as déjà le dépôt (pour le bot littledesire), fais seulement `git pull`, puis `cd ../kirby-bot`.

### Le fichier `.env`

| Ligne | Quoi mettre |
|---|---|
| `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` | Les infos du bot et du serveur |
| `PSEUDO`, `SERVER_NAME` | `Kirby` et `Kirby World` (déjà remplis) |
| `STAFF_ROLE_IDS` | Les IDs des rôles qui voient les tickets (Fondateur, Kirby, Manager), séparés par des virgules. Clic droit sur un rôle > **Copier l'identifiant du rôle** |
| `MEMBER_ROLE_IDS` | Le ou les rôles donnés en acceptant le règlement. Plusieurs rôles = sur **la même ligne**, séparés par une virgule : `MEMBER_ROLE_IDS=111...,222...`. Vide = le rôle qui s'appelle « Membre » |
| `HOMME_ROLE_ID`, `FEMME_ROLE_ID` | Vide = le bot cherche un rôle « Homme » / « Femme » (même avec des décorations dans le nom) et les crée s'ils n'existent pas |
| `CATEGORIE_PRESTATION_ID`, `CATEGORIE_QUESTION_ID`, `CATEGORIE_REPORT_ID` | Vide = `/installer tickets` crée les catégories. Tu peux aussi mettre l'ID de catégories qui existent déjà |

Pour copier des IDs : Paramètres Discord > Avancés > **Mode développeur**.

## 3. Poster les panneaux

Dans le salon voulu, tape une de ces commandes (réservées aux admins). Elles peuvent être relancées sans créer de doublon : le message existant est mis à jour.

| Commande | Ce que ça fait |
|---|---|
| `/installer tickets` | Crée les 3 catégories de tickets si elles n'existent pas (invisibles sauf pour le staff) et poste le panneau « Espace Tickets » |
| `/installer reglement` | Poste le règlement avec le bouton **✅ J'accepte le règlement** |
| `/installer genre` | Poste le choix Homme / Femme (crée les rôles s'ils n'existent pas) |

Tu peux ajouter `salon:` pour choisir un autre salon que le salon actuel.

## Les tickets

Le menu **Fais un choix** propose :
- **💖 PRESTATION** : le ticket s'ouvre dans la catégorie **🌸 • Tickets Prestations** ;
- **💖 QUESTION** : dans **❓ • Tickets Questions** ;
- **💖 REPORT** : dans **🚩 • Tickets Reports**.

Seuls la personne et le staff voient son ticket. Chaque personne a un seul ticket ouvert par type. Dans le ticket, trois boutons :
- **🙋 Prendre en charge** (staff) : affiche qui s'en occupe ;
- **✏️ Renommer** (staff) : change le nom du ticket pour s'y retrouver. `/ticket renommer nom:` fait pareil. Discord limite à 2 renommages toutes les 10 minutes par salon ;
- **🔒 Fermer le ticket** : supprime le salon (la personne ou le staff).

### Les images du panneau

Mets tes photos dans le dossier `assets/` (voir `assets/LISEZ-MOI.txt`) :
- `miniature.png` : la petite image en haut à droite ;
- `ticket-1.png` (jusqu'à `ticket-4.png`) : les grandes images en dessous, en grille s'il y en a plusieurs.

Puis redémarre le bot et retape `/installer tickets` dans le salon des tickets : le panneau est mis à jour. Les titres et textes sont dans `src/config.js` (`TICKET_PANEL`, `TICKET_TYPES`).

## Le règlement

Le texte est dans `textes/reglement.md`. Écrire `#tickets` dans le texte crée un lien cliquable vers le salon. Après une modification, retape `/installer reglement`.

## Mettre à jour

```bash
npm run update      # récupère la nouvelle version, installe, met à jour les commandes slash
```
Puis redémarre le bot. Le `.env` et le dossier `data/` ne sont jamais écrasés.

## Sur le VPS

```bash
git clone -b claude/friendly-mccarthy-chqh2l https://github.com/zozo02/party-games-app.git
cd party-games-app/kirby-bot
nano .env
npm install
npm run deploy
pm2 start src/index.js --name kirbyworld-bot
pm2 save
```
Ensuite : `npm run update` puis `pm2 restart kirbyworld-bot` pour une nouvelle version, `pm2 logs kirbyworld-bot` pour voir les messages.

## Problèmes fréquents

- **« Je n'ai pas la permission »** : mets le rôle du bot au-dessus des autres rôles et donne-lui Administrateur.
- **Personne ne voit les tickets à part les admins** : remplis `STAFF_ROLE_IDS` dans le `.env`, redémarre, et fais `/installer tickets` pour les catégories créées ensuite. Pour les catégories déjà créées, ajoute le rôle à la main dans leurs permissions.
- **Les commandes slash n'apparaissent pas** : relance `npm run deploy` et vérifie que le bot a été invité avec le lien de l'étape 1.
