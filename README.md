# Succès et quêtes Dofus

Page autonome pour suivre ses succès de quêtes, ses quêtes et ses Dofus, avec plusieurs profils (un par personnage).
Données issues uniquement de l'API DofusDB. Les coches sont enregistrées dans le navigateur (localStorage + copie IndexedDB).

## Fichiers

- `ordre-contenu-200.html` : la page finale, données incluses. S'ouvre directement dans un navigateur.
- `succes-dofusdb.json` : les données DofusDB préparées (catégories, succès, objectifs, quêtes, Dofus).
- `scripts/achievements.js` : télécharge les données DofusDB (avec cache dans `cache/`) et écrit le JSON.
- `scripts/enrich-quetes.js` : complète le JSON avec, pour chaque quête, les étiquettes (donjon, combat, farm, craft, exploration), les donjons concernés et ce qu'il y a à faire. Mêmes données DofusDB, avec cache dans `cache/`.
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
