# Progression Dofus

Page autonome pour suivre sa progression dans Dofus : succès de quêtes, quêtes, donjons et Dofus, avec plusieurs profils (un par personnage).
Elle est née pour suivre le contenu de niveau 200 ; elle couvre désormais tout le contenu, tous niveaux confondus. Le niveau du personnage (200 par défaut) sert seulement à savoir quelles quêtes sont disponibles.

Données issues uniquement de l'API DofusDB. Les coches sont enregistrées dans le navigateur (localStorage + copie IndexedDB).

Etats d'une quête : faite (cochée), commencée ou bloquée (à indiquer dans la fiche), disponible ou indisponible (déduit du niveau et des prérequis). La pastille de la liste le montre : vert disponible, jaune commencée, rouge bloquée, vide pointillé indisponible, coche verte faite.

## Fichiers

- `dist/index.html` : la page finale, données incluses, générée par `npm run build` (non versionnée : la CI la reconstruit à chaque publication). S'ouvre directement dans un navigateur.
- `data/dofusdb.json` : les données DofusDB préparées (catégories, succès, objectifs, quêtes, donjons, Dofus).
- `scripts/update-data.js` : met à jour ces données en une commande (`npm run data`) : télécharge puis enrichit, dans l'ordre, avec un même client et un même cache dans `cache/`.
- `scripts/fetch-dofusdb.js` : télécharge succès, objectifs, quêtes et Dofus depuis DofusDB et écrit le JSON.
- `scripts/enrich-dofusdb.js` : complète le JSON avec, pour chaque quête, les étiquettes (donjon, combat, farm, craft, exploration), le type (icône), la tranche de niveau, les donjons concernés et ce qu'il y a à faire ; ajoute aussi la fiche des donjons (niveau optimal, boss).
- `scripts/lib/dofusdb.js` : le client de l'API (pages de 50 maximum, reprises, cache disque). L'accès réseau est injectable : les tests utilisent une fausse API.
- `scripts/lib/criteria.js` : lecture des critères DofusDB (objectifs de succès, conditions de départ des quêtes).
- `scripts/lib/tracked-content.js` : la règle « ce qui est suivi » (succès de quêtes, contenu saisonnier, entrées du menu), appliquée au build ; la page lit les drapeaux qu'elle pose.
- `scripts/build.js` : assemble la page (`dist/index.html`) depuis la coquille, la feuille de style, les fichiers de `src/page/`, les modules de `src/` et le JSON.
- `src/page.html`, `src/style.css` et `src/page/*.js` : la page. La coquille HTML, la feuille de style et une douzaine de fichiers de script (un par partie : stockage, modèle, Dofus, cascade, listes, fiche, événements, mobile, synchro, profils), assemblés dans l'ordre de leur nom en un seul script.
- `src/progression.js` : le module de règles de progression (statuts, disponibilité, cascade, objectifs). Il possède l'état suivi et ses caches ; le build l'insère dans la page, et les tests le chargent directement.
- `src/progress-store.js` : le module de progression persistée (profils, sauvegarde par profil, synchro entre appareils, export et import). Il parle à un stockage et à un distant interchangeables : le navigateur et Firestore dans la page, une mémoire et un faux distant dans les tests.
- `tests/` : tests des deux modules (`npm test`) et contrôles de bout en bout dans Chrome (`npm run test:e2e`).
- `docs/maquettes/style.html` : maquette statique de la direction visuelle.
- `docs/maquettes/mobile.html` : maquette des deux navigations mobile étudiées (la version à onglets a été retenue).
- `docs/maquettes/donjons.html` : maquette de la vue Donjons.
- `docs/references/` : captures du jeu qui servent de référence visuelle.
- `apps/pet-xp/` : calculateur d'XP de familier, une application à part publiée sur `/pet-xp.html`. `resources.json` est la source des données embarquées dans la page (aucun script ne la régénère).

## Régénérer

```bash
npm run data    # rafraîchit les données DofusDB (télécharge puis enrichit, dans l'ordre)
npm run build   # assemble dist/index.html depuis le modèle et le JSON
```

`npm run data` ne sert qu'à rafraîchir les données DofusDB (sans le dossier `cache/`, tout est retéléchargé ; `DOFUSDB_CACHE` change l'emplacement du cache). Les deux étapes s'enchaînent toujours dans le même ordre, car l'enrichissement complète le JSON que le téléchargement réécrit.

## Tests

```bash
npm test             # règles de progression, sans navigateur (lancé par la CI avant chaque publication)
npm run build && npm run test:e2e   # bout en bout dans Chrome ; CHROME_BIN pour indiquer le binaire
UPDATE_GOLDEN=1 npm run test:e2e    # après un `npm run data` ou un changement voulu des règles : refait tests/browser/golden.json
```

La CI lance les tests unitaires avant chaque publication (`.github/workflows/deploy-pages.yml`), et le workflow `Tests` rejoue unitaires et bout en bout sur chaque push, sans bloquer le déploiement.

`tests/browser/golden.json` est la « photo » des règles sur les vraies données (statut de chaque quête, cascades dans les deux sens, objectifs…) : elle a été prise avant l'extraction du module et sert de référence.

## Mobile

Sous 700 px de large, la page passe en navigation par onglets en bas (Succès, Quêtes, Donjons, Dofus, Réglages) : le choix de catégorie se fait par un menu sous la recherche, et la fiche d'une quête ou d'un succès s'ouvre en feuille par-dessus la liste.

## Synchronisation entre appareils (optionnelle)

Connexion Google (Firebase Auth) et stockage Firestore, projet `dofus-fc9d3`. La page marche sans : les coches restent dans le navigateur, la synchro n'est qu'une copie.

- Un document par utilisateur, `users/{uid}`, avec un champ par profil (coches, niveau, Dofus). Rien d'autre n'est stocké.
- Chaque profil garde la valeur de `savedAt` de la dernière synchro. Seul le local a changé : envoi. Seul le cloud : réception. Les deux : fusion des coches après confirmation (une coche retirée d'un côté peut revenir).
- La clé de `FIREBASE_CONFIG` est publique par conception. L'accès est protégé par `firestore.rules` et par les domaines autorisés de Firebase.

À faire une fois dans la console Firebase :

1. Authentication › Commencer › Google : activer, choisir l'e-mail d'assistance.
2. Authentication › Paramètres › Domaines autorisés : ajouter `mazakiel.github.io`.
3. Firestore Database › Créer une base (mode production), puis onglet Règles : coller `firestore.rules` et publier.
