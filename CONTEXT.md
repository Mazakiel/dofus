# Contexte du domaine

Vocabulaire du projet, tel qu'il apparaît dans le code et dans la page. À mettre à jour quand un terme change.

**Périmètre.** Suivi de la progression dans Dofus : succès de quêtes, quêtes, donjons et Dofus, tous niveaux. L'application a commencé comme un suivi du contenu de niveau 200 ; ce n'est plus le cas. Deux noms historiques subsistent et ne doivent pas changer, car ils portent des données déjà enregistrées : le préfixe de stockage `c200:` et la base IndexedDB `contenu200`.

- **Succès** : réalisation du jeu, avec des objectifs. Seuls les *succès de quêtes* sont suivis (catégorie Quêtes et Événements, hors « Général »).
- **Objectif (d'un succès)** : une quête, un sous-succès, un niveau à atteindre, ou un autre objectif coché à la main (type `x`).
- **Quête** : étape du jeu, avec prérequis (quêtes, succès, Dofus à posséder, niveau).
- **Statut (d'une quête)** : `done` faite · `bl` bloquée · `st` commencée · `av` disponible · `lock` indisponible. *Faite* se coche ; *bloquée* et *commencée* se saisissent à la main ; *disponible* et *indisponible* se déduisent du niveau et des prérequis.
- **Dofus** : objet obtenu via un succès ou une quête. Il peut être **objectif** (visé), et **forcé** à la main (`owned` / `missing`).
- **Objectif Dofus** (« Mes objectifs ») : les quêtes et succès qui restent à faire pour obtenir un Dofus visé.
- **Cascade** : ce que valider un élément entraîne (ses prérequis) ou ce que le décocher entraîne (ce qui en dépend).
- **Profil** : un personnage ; ses coches, son niveau et ses Dofus lui sont propres. Chaque donnée suivie est stockée sous `c200:p:<profil>:<clé>` (préfixe historique, voir le périmètre).
- **Donjon** : fiche DofusDB (niveau optimal, boss) à laquelle des quêtes se rattachent.

## Modules

- **Module progression** (`src/progression.js`) : possède l'état suivi et ses caches, et toutes les règles ci-dessus. Son état est suivi : toute modification, même directe, invalide les caches. Il ne connaît ni le DOM, ni le stockage, ni les options d'affichage (celles-ci sont passées en paramètre à `questShown` / `achShown`).
- **Module progression persistée** (`src/progress-store.js`) : possède les profils, la liste des clés d'une progression, la sérialisation (synchro, export, import) et la décision de synchro (envoyer, recevoir, fusionner). Il parle à un **stockage** et à un **distant** : le navigateur (localStorage + copie IndexedDB) et Firestore dans la page, une mémoire et un faux distant dans les tests. La disposition des clés est historique et ne change pas.
- **Module données DofusDB** (`scripts/lib/dofusdb.js`) : détient ce qu'on sait de l'API (pages de 50 maximum, reprises, cache). Deux adapters : le réseau en production, une fausse API dans les tests.
- **Contenu suivi** (`scripts/lib/tracked-content.js`) : la règle de ce que l'application suit, appliquée une fois au build. La page lit ses drapeaux (`t` suivi, `s` saisonnier) et le menu qu'il fournit.
- **La page** (`src/page.html` + `src/style.css` + `src/page/*.js`) : vues, fiches, onglets, profils et adapters. Elle interroge le module progression ; une modification de l'état déclenche la sauvegarde toute seule (le module progression prévient ses abonnés).
