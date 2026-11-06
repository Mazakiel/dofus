# Succès et quêtes Dofus

Page autonome pour suivre ses succès de quêtes, ses quêtes et ses Dofus, avec plusieurs profils (un par personnage).
Données issues uniquement de l'API DofusDB. Les coches sont enregistrées dans le navigateur (localStorage + copie IndexedDB).

Etats d'une quête : faite (cochée), commencée ou bloquée (à indiquer dans la fiche), disponible ou indisponible (déduit du niveau et des prérequis). La pastille de la liste le montre : vert disponible, jaune commencée, rouge bloquée, vide pointillé indisponible, coche verte faite.

## Fichiers

- `ordre-contenu-200.html` : la page finale, données incluses. S'ouvre directement dans un navigateur.
- `succes-dofusdb.json` : les données DofusDB préparées (catégories, succès, objectifs, quêtes, Dofus).
- `scripts/achievements.js` : télécharge les données DofusDB (avec cache dans `cache/`) et écrit le JSON.
- `scripts/enrich-quetes.js` : complète le JSON avec, pour chaque quête, les étiquettes (donjon, combat, farm, craft, exploration), le type (icône), la tranche de niveau, les donjons concernés et ce qu'il y a à faire ; ajoute aussi la fiche des donjons (niveau optimal, boss). Mêmes données DofusDB, avec cache dans `cache/`.
- `scripts/build-succes.js` : injecte le JSON dans `scripts/template-succes.html` pour produire la page.
- `scripts/template-succes.html` : le modèle de la page (style, logique, profils).
- `maquette-style.html` : maquette statique de la direction visuelle.
- `maquette-mobile.html` : maquette des deux navigations mobile étudiées (la version à onglets a été retenue).

## Régénérer

```bash
node scripts/achievements.js succes-dofusdb.json
node scripts/enrich-quetes.js succes-dofusdb.json
node scripts/build-succes.js succes-dofusdb.json ordre-contenu-200.html
```

Les deux premières commandes ne servent qu'à rafraîchir les données DofusDB (sans le dossier `cache/`, elles retéléchargent tout). `enrich-quetes.js` doit être relancé après `achievements.js`, qui réécrit le JSON.

## Mobile

Sous 700 px de large, la page passe en navigation par onglets en bas (Succès, Quêtes, Dofus, Réglages) : le choix de catégorie se fait par un menu sous la recherche, et la fiche d'une quête ou d'un succès s'ouvre en feuille par-dessus la liste.

## Synchronisation entre appareils (optionnelle)

Connexion Google (Firebase Auth) et stockage Firestore, projet `dofus-fc9d3`. La page marche sans : les coches restent dans le navigateur, la synchro n'est qu'une copie.

- Un document par utilisateur, `users/{uid}`, avec un champ par profil (coches, niveau, Dofus). Rien d'autre n'est stocké.
- Chaque profil garde la valeur de `savedAt` de la dernière synchro. Seul le local a changé : envoi. Seul le cloud : réception. Les deux : fusion des coches après confirmation (une coche retirée d'un côté peut revenir).
- La clé de `FIREBASE_CONFIG` est publique par conception. L'accès est protégé par `firestore.rules` et par les domaines autorisés de Firebase.

À faire une fois dans la console Firebase :

1. Authentication › Commencer › Google : activer, choisir l'e-mail d'assistance.
2. Authentication › Paramètres › Domaines autorisés : ajouter `mazakiel.github.io`.
3. Firestore Database › Créer une base (mode production), puis onglet Règles : coller `firestore.rules` et publier.
