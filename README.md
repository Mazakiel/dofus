# Succès et quêtes Dofus

Page autonome pour suivre ses succès de quêtes, ses quêtes et ses Dofus, avec plusieurs profils (un par personnage).
Données issues uniquement de l'API DofusDB. Les coches sont enregistrées dans le navigateur (localStorage + copie IndexedDB).

## Fichiers

- `ordre-contenu-200.html` : la page finale, données incluses. S'ouvre directement dans un navigateur.
- `succes-dofusdb.json` : les données DofusDB préparées (catégories, succès, objectifs, quêtes, Dofus).
- `scripts/achievements.js` : télécharge les données DofusDB (avec cache dans `cache/`) et écrit le JSON.
- `scripts/build-succes.js` : injecte le JSON dans `scripts/template-succes.html` pour produire la page.
- `scripts/template-succes.html` : le modèle de la page (style, logique, profils).
- `maquette-style.html` : maquette statique de la direction visuelle.

## Régénérer

```bash
node scripts/achievements.js succes-dofusdb.json
node scripts/build-succes.js succes-dofusdb.json ordre-contenu-200.html
```

La première commande n'est utile que pour rafraîchir les données DofusDB ; sans le dossier `cache/`, elle retélécharge tout.
