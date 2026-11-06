# Contexte du domaine

Vocabulaire du projet, tel qu'il apparaît dans le code et dans la page. À mettre à jour quand un terme change.

- **Succès** : réalisation du jeu, avec des objectifs. Seuls les *succès de quêtes* sont suivis (catégorie Quêtes et Événements, hors « Général »).
- **Objectif (d'un succès)** : une quête, un sous-succès, un niveau à atteindre, ou un autre objectif coché à la main (type `x`).
- **Quête** : étape du jeu, avec prérequis (quêtes, succès, Dofus à posséder, niveau).
- **Statut (d'une quête)** : `done` faite · `bl` bloquée · `st` commencée · `av` disponible · `lock` indisponible. *Faite* se coche ; *bloquée* et *commencée* se saisissent à la main ; *disponible* et *indisponible* se déduisent du niveau et des prérequis.
- **Dofus** : objet obtenu via un succès ou une quête. Il peut être **objectif** (visé), et **forcé** à la main (`owned` / `missing`).
- **Objectif Dofus** (« Mes objectifs ») : les quêtes et succès qui restent à faire pour obtenir un Dofus visé.
- **Cascade** : ce que valider un élément entraîne (ses prérequis) ou ce que le décocher entraîne (ce qui en dépend).
- **Profil** : un personnage ; ses coches, son niveau et ses Dofus lui sont propres. Chaque donnée suivie est stockée sous `c200:p:<profil>:<clé>` (le préfixe `c200:` est historique : ne pas le renommer, il porte les coches déjà enregistrées).
- **Donjon** : fiche DofusDB (niveau optimal, boss) à laquelle des quêtes se rattachent.

## Modules

- **Module progression** (`src/progression.js`) : possède l'état suivi et ses caches, et toutes les règles ci-dessus. Son état est suivi : toute modification, même directe, invalide les caches. Il ne connaît ni le DOM, ni le stockage, ni les options d'affichage (celles-ci sont passées en paramètre à `questShown` / `achShown`).
- **La page** (`scripts/template-succes.html`) : vues, fiches, onglets, profils et synchro. Elle interroge le module progression et persiste son état.
