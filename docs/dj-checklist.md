# Check-list : objectifs de quêtes dans les donjons

Passe de lecture des guides Dofus pour les Noobs, donjon par donjon, pour valider ce qui s'affiche dans « À faire dans le donjon ».

- **Analysé** : Claude a lu la page DPLN de chaque quête du donjon et consigné les corrections dans `data/dofusdb-fixes.json` (notes à l'appui).
- **Validé** : Stan a relu le résultat dans l'appli.
- **Quêtes** : nombre de quêtes qui touchent le donjon ; **avec actions** : quêtes dont le détail par salle n'est pas vide ; **seulement le donjon** : quêtes qui ne demandent que de le faire (boss, butin, salle finale).
- Les trois premiers sont les donjons pilotes (format à valider avant le reste).
- Le genre d'une ligne : **faire le donjon** (boss, mini-boss, butin, salle finale), **action de salle**, **après le boss** (⚠ à faire avant de sortir), ou **hors du détail** (rapporter à un PNJ hors du donjon).

## Notes d'analyse

### Bibliothèque du Maître Corbac (id 3) : analysé, à valider
- Quêtes : *Voler dans les plumes* (1775), *Le livre des Taures* (1521), *Des donjons, encore des donjons* (156, seulement le donjon).
- **Écart DofusDB trouvé** : *Le livre des Taures* demande de voler le livre au Maître Corbac, mais DofusDB ne rattache pas cet objectif au donjon. Corrigé (quête 1521, « faire le donjon »).
- **Mini-boss** : « Vaincre Capsaaloocke » est obligatoire pour atteindre le boss : classé « faire le donjon ».
- **Ordre** : Deuxième salle → Septième salle → Salle du trône → Antichambre. L'antichambre est la salle de sortie après le boss.
- **⚠ Avant de sortir** : rendre le Guide du Maître Corbac à Natacha Manka (page DPLN : « Avant de sortir, parlez à Natacha Manka qui vous demandera le guide »).
- **À savoir** : le donjon a été refait en janvier 2025 (16 salles, accès libre) et la page de la quête date de 2016 ; les objectifs de DofusDB, eux, sont à jour. La page DPLN sert ici de repère, pas de vérité absolue.


| Analysé | Validé | Donjon | Niv. | Quêtes | Avec actions | Seulement le donjon | Salles actuelles | Guide |
|:-:|:-:|---|:-:|:-:|:-:|:-:|---|---|
| ☑ | ☐ | **Bibliothèque du Maître Corbac** (id 3) | 110 | 2 | 1 | 1 | Deuxième salle, Septième salle, Salle du trône, Salle non précisée | [guide](https://www.dofuspourlesnoobs.com/bibliotheque-du-maitre-corbac.html) |
| ☐ | ☐ | **Serre du Royalmouth** (id 54) | 120 | 6 | 2 | 2 | Sixième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/serre-du-royalmouth.html) |
| ☐ | ☐ | **Cavernes du Kolosso** (id 60) | 190 | 4 | 1 | 2 | Quatrième salle, Cinquième salle | [guide](https://www.dofuspourlesnoobs.com/cavernes-du-kolosso.html) |
| ☐ | ☐ | **Crypte de Kardorim** (id 90) | 10 | 2 | 2 | 0 | Crypte du Milimilou, Tombe de Kardorim, Sortie | [guide](https://www.dofuspourlesnoobs.com/crypte-de-kardorim.html) |
| ☐ | ☐ | **Château Ensablé** (id 19) | 20 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/chateau-ensable.html) |
| ☐ | ☐ | **Grange du Tournesol Affamé** (id 8) | 20 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/grange-du-tournesol-affame.html) |
| ☐ | ☐ | **Cour du Bouftou Royal** (id 1) | 30 | 2 | 1 | 1 | Temple des chachas noirs | [guide](https://www.dofuspourlesnoobs.com/cour-du-bouftou-royal.html) |
| ☐ | ☐ | **Akadémie des Gobs** (id 138) | 40 | 3 | 2 | 1 | Bureau du Directeur Grunob | [guide](https://www.dofuspourlesnoobs.com/akademie-des-gobs.html) |
| ☐ | ☐ | **Cache de Kankreblath** (id 88) | 40 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/cache-de-kankreblath.html) |
| ☐ | ☐ | **Donjon des Scarafeuilles** (id 45) | 40 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-des-scarafeuilles.html) |
| ☐ | ☐ | **Donjon des Squelettes** (id 47) | 40 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-des-squelettes.html) |
| ☐ | ☐ | **Donjon des Tofus** (id 48) | 40 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-des-tofus.html) |
| ☐ | ☐ | **Maison Fantôme** (id 34) | 40 | 3 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/maison-fantome.html) |
| ☐ | ☐ | **Donjon de Nowel** (id 36) | 50 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-de-nowel.html) |
| ☐ | ☐ | **Donjon des Bworks** (id 13) | 50 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-des-bworks.html) |
| ☐ | ☐ | **Donjon des Forgerons** (id 21) | 50 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-des-forgerons.html) |
| ☐ | ☐ | **Donjon des Larves** (id 33) | 50 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-des-larves.html) |
| ☐ | ☐ | **Grotte Hesque** (id 25) | 50 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/grotte-hesque.html) |
| ☐ | ☐ | **Nid du Kwakwa** (id 32) | 50 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/nid-du-kwakwa.html) |
| ☐ | ☐ | **Refuge sylvestre** (id 142) | 50 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/refuge-sylvestre.html) |
| ☐ | ☐ | **Château du Wa Wabbit** (id 52) | 60 | 3 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/chateau-du-wa-wabbit.html) |
| ☐ | ☐ | **Clos des Blops** (id 11) | 60 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/clos-des-blops.html) |
| ☐ | ☐ | **Fonderie des Waddicts** (id 113) | 60 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/fonderie-des-waddicts.html) |
| ☐ | ☐ | **Gelaxième Dimension** (id 24) | 60 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/gelaxieme-dimension.html) |
| ☐ | ☐ | **Village Kanniboul** (id 27) | 60 | 4 | 2 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/village-kanniboul.html) |
| ☐ | ☐ | **Cale de l'Arche d'Otomaï** (id 39) | 70 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/arche-dotomaiuml.html) |
| ☐ | ☐ | **Laboratoire de Brumen Tinctorias** (id 35) | 70 | 4 | 2 | 1 | Première salle, Deuxième salle, Troisième salle, Quatrième salle, Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/laboratoire-de-brumen-tinctorias.html) |
| ☐ | ☐ | **Pitons Rocheux des Craqueleurs** (id 18) | 70 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/pitons-rocheux-des-craqueleurs.html) |
| ☐ | ☐ | **Épreuve de Draegnerys** (id 116) | 70 | 3 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/epreuve-de-draegnerys.html) |
| ☐ | ☐ | **Cimetière des Mastodontes** (id 100) | 80 | 3 | 1 | 2 | Troisième Salle, Quatrième Salle, Dernière Salle | [guide](https://www.dofuspourlesnoobs.com/cimetiere-des-mastodontes.html) |
| ☐ | ☐ | **Terrier du Wa Wabbit** (id 17) | 80 | 3 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/terrier-du-wa-wabbit.html) |
| ☐ | ☐ | **Antre de la Reine Nyée** (id 89) | 90 | 5 | 2 | 1 | Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/antre-de-la-reine-nyeacutee.html) |
| ☐ | ☐ | **Bateau du Chouque** (id 91) | 90 | 3 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/bateau-du-chouque.html) |
| ☐ | ☐ | **Chapiteau des Magik Riktus** (id 105) | 90 | 2 | 1 | 1 | Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/chapiteau-des-magik-riktus.html) |
| ☐ | ☐ | **Domaine Ancestral** (id 9) | 90 | 3 | 2 | 1 | Cinquième salle, Clairière aux corbacs, Sortie | [guide](https://www.dofuspourlesnoobs.com/domaine-ancestral.html) |
| ☐ | ☐ | **Antre du Dragon Cochon** (id 6) | 100 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/antre-du-dragon-cochon.html) |
| ☐ | ☐ | **Arbre de Moon** (id 92) | 100 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/arbre-de-moon.html) |
| ☐ | ☐ | **Caverne du Koulosse** (id 30) | 100 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/caverne-du-koulosse.html) |
| ☐ | ☐ | **Fabrique de Malléfisk** (id 77) | 100 | 2 | 2 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/fabrique-mallefisk.html) |
| ☐ | ☐ | **Potager d'Halouine** (id 66) | 100 | 1 | 1 | 0 | Potager, Potager d'Halouine | [guide](https://www.dofuspourlesnoobs.com/potager-dhalouine.html) |
| ☐ | ☐ | **Repaire du Kharnozor** (id 115) | 100 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/repaire-du-kharnozor.html) |
| ☐ | ☐ | **Tanière du Meulou** (id 15) | 100 | 2 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/taniere-du-meulou.html) |
| ☐ | ☐ | **Théâtre de Dramak** (id 72) | 100 | 2 | 1 | 1 | Salle 4, Sortie | [guide](https://www.dofuspourlesnoobs.com/theacuteacirctre-de-dramak.html) |
| ☐ | ☐ | **Bambusaie de Damadrya** (id 125) | 110 | 3 | 2 | 0 | Cinquième salle, Salle 208670722 | [guide](https://www.dofuspourlesnoobs.com/bambusaie-de-damadrya.html) |
| ☐ | ☐ | **Garde-manger du Rat Blanc** (id 42) | 110 | 3 | 2 | 1 | Garde-manger du Rat Blanc, Salle 217062410 | [guide](https://www.dofuspourlesnoobs.com/garde-manger-du-rat-blanc.html) |
| ☐ | ☐ | **Goulet du Rasboul** (id 41) | 110 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/goulet-du-rasboul.html) |
| ☐ | ☐ | **Miausolée du Pounicheur** (id 93) | 110 | 1 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/miausoleacutee-du-pounicheur.html) |
| ☐ | ☐ | **Sousouricière du Rat Noir** (id 43) | 110 | 2 | 1 | 1 | Sousouricière du Rat Noir | [guide](https://www.dofuspourlesnoobs.com/sousouriciere-du-rat-noir.html) |
| ☐ | ☐ | **Antre de Crocabulia** (id 7) | 120 | 3 | 1 | 2 | Cinquième salle | [guide](https://www.dofuspourlesnoobs.com/antre-de-crocabulia.html) |
| ☐ | ☐ | **Antre du Blop Multicolore Royal** (id 49) | 120 | 3 | 1 | 1 | Grande salle | [guide](https://www.dofuspourlesnoobs.com/antre-du-blop-multicolore-royal.html) |
| ☐ | ☐ | **Centre du Labyrinthe du Minotoror** (id 4) | 120 | 6 | 4 | 1 | Antichambre, Entrée, Labyrinthe des âmes, Salle du Dofus, Salle du Minotoror | [guide](https://www.dofuspourlesnoobs.com/centre-du-labyrinthe-du-minotoror.html) |
| ☐ | ☐ | **Mégalithe de Fraktale** (id 85) | 120 | 5 | 4 | 1 | Salle de la Pierre de Méthée, Sortie | [guide](https://www.dofuspourlesnoobs.com/meacutegalithe-de-fraktale.html) |
| ☐ | ☐ | **Repaire de Skeunk** (id 46) | 120 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/repaire-de-skeunk.html) |
| ☐ | ☐ | **Tofulailler Royal** (id 50) | 120 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/tofulailler-royal.html) |
| ☐ | ☐ | **Atelier du Tanukouï San** (id 126) | 130 | 2 | 1 | 1 | Salle 208932866 | [guide](https://www.dofuspourlesnoobs.com/atelier-du-tanukoui-san.html) |
| ☐ | ☐ | **Caverne d'El Piko** (id 101) | 130 | 2 | 1 | 1 | Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/caverne-d-el-piko.html) |
| ☐ | ☐ | **Croquanterie** (id 112) | 130 | 2 | 1 | 1 | La Croquanterie - Sortie | [guide](https://www.dofuspourlesnoobs.com/croquanterie.html) |
| ☐ | ☐ | **Ring du Capitaine Ekarlatte** (id 81) | 130 | 2 | 1 | 1 | Sortie du Ring | [guide](https://www.dofuspourlesnoobs.com/ring-du-capitaine-ekarlatte.html) |
| ☐ | ☐ | **Vallée de la Dame des eaux** (id 123) | 130 | 1 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/vallee-de-la-dame-des-eaux.html) |
| ☐ | ☐ | **Volière de la Haute Truche** (id 80) | 130 | 2 | 0 | 0 | — | [guide](https://www.dofuspourlesnoobs.com/voliegravere-de-la-haute-truche.html) |
| ☐ | ☐ | **Clairière du Chêne Mou** (id 10) | 140 | 6 | 4 | 1 | Cinquième salle, Bosquet désenchanté, Sortie | [guide](https://www.dofuspourlesnoobs.com/clairiegravere-du-checircne-mou.html) |
| ☐ | ☐ | **Dojo du Vent** (id 122) | 140 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/dojo-du-vent.html) |
| ☐ | ☐ | **Excavation du Mansot Royal** (id 55) | 140 | 4 | 1 | 2 | Cinquième salle | [guide](https://www.dofuspourlesnoobs.com/excavation-du-mansot-royal.html) |
| ☐ | ☐ | **Fabrique de foux d'artifice** (id 124) | 140 | 3 | 0 | 3 | — | [guide](https://www.dofuspourlesnoobs.com/fabrique-de-foux-d-artifice.html) |
| ☐ | ☐ | **Laboratoire du Tynril** (id 51) | 140 | 3 | 0 | 3 | — | [guide](https://www.dofuspourlesnoobs.com/laboratoire-du-tynril.html) |
| ☐ | ☐ | **Galerie du Phossile** (id 79) | 150 | 3 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/galerie-du-phossile.html) |
| ☐ | ☐ | **Repaire de Sphincter Cell** (id 44) | 150 | 2 | 0 | 2 | — | [guide](https://www.dofuspourlesnoobs.com/donjon-des-rats-du-chacircteau-damakna.html) |
| ☐ | ☐ | **Tertre du long sommeil** (id 139) | 150 | 4 | 4 | 0 | Chambre du mal | [guide](https://www.dofuspourlesnoobs.com/tertre-du-long-sommeil.html) |
| ☐ | ☐ | **Épave du Grolandais violent** (id 56) | 150 | 3 | 1 | 2 | Cinquième salle | [guide](https://www.dofuspourlesnoobs.com/epave-du-grolandais-violent.html) |
| ☐ | ☐ | **Canopée du Kimbo** (id 28) | 160 | 3 | 1 | 2 | Sortie | [guide](https://www.dofuspourlesnoobs.com/canopeacutee-du-kimbo.html) |
| ☐ | ☐ | **Grotte de Kanigroula** (id 75) | 160 | 3 | 1 | 2 | Sortie | [guide](https://www.dofuspourlesnoobs.com/grotte-de-kanigroula.html) |
| ☐ | ☐ | **Hypogée de l'Obsidiantre** (id 57) | 160 | 6 | 4 | 2 | Antichambre du S.L.I.P., Première salle, Sixième salle, Salle 171180034, Salle 171180036 | [guide](https://www.dofuspourlesnoobs.com/hypogeacutee-de-lobsidiantre.html) |
| ☐ | ☐ | **Plateau de Ush** (id 94) | 160 | 2 | 2 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/plateau-de-ush.html) |
| ☐ | ☐ | **Tombe du Shogun Tofugawa** (id 132) | 160 | 3 | 2 | 0 | Première Salle, Cinquième Salle | [guide](https://www.dofuspourlesnoobs.com/tombe-du-shogun-tofugawa.html) |
| ☐ | ☐ | **Boyau du Père Ver** (id 102) | 170 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/boyau-du-pere-ver.html) |
| ☐ | ☐ | **Demeure des Esprits** (id 131) | 170 | 3 | 3 | 0 | Première salle, Cinquième salle | [guide](https://www.dofuspourlesnoobs.com/demeure-des-esprits.html) |
| ☐ | ☐ | **Horologium de XLII** (id 86) | 170 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/horologium-de-xlii.html) |
| ☐ | ☐ | **Poste de contrôle du Supervizœuf** (id 163) | 170 | 2 | 2 | 0 | Chambrzbz rzznzbz, Poztzbz kontrolzbz - Zortzzbz | [guide](https://www.dofuspourlesnoobs.com/poste-de-controle-du-supervizoeuf.html) |
| ☐ | ☐ | **Tanière Givrefoux** (id 58) | 170 | 2 | 1 | 1 | Cinquième salle, Sortie vers la forêt pétrifiée | [guide](https://www.dofuspourlesnoobs.com/taniegravere-givrefoux.html) |
| ☐ | ☐ | **Antre du Korriandre** (id 59) | 180 | 5 | 2 | 3 | Cinquième salle, Salle 62921728 | [guide](https://www.dofuspourlesnoobs.com/antre-du-korriandre.html) |
| ☐ | ☐ | **Antre du Kralamoure Géant** (id 31) | 180 | 2 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/antre-du-kralamoure-geacuteant.html) |
| ☐ | ☐ | **Cave du Toxoliath** (id 82) | 180 | 2 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/cave-du-toxoliath.html) |
| ☐ | ☐ | **Grotte du Bworker** (id 14) | 180 | 2 | 0 | 2 | — | [guide](https://www.dofuspourlesnoobs.com/grotte-du-bworker.html) |
| ☐ | ☐ | **Temple du Grand Ougah** (id 22) | 180 | 4 | 2 | 2 | Première salle, Deuxième salle, Troisième salle, Huitième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/temple-du-grand-ougah.html) |
| ☐ | ☐ | **Antichambre des Gloursons** (id 61) | 190 | 3 | 1 | 1 | Chambre du Glourséleste, Sortie | [guide](https://www.dofuspourlesnoobs.com/antichambre-des-gloursons.html) |
| ☐ | ☐ | **Bastion des Marteaux-Aigris** (id 141) | 190 | 3 | 3 | 0 | Première salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/bastion-des-marteaux-aigris.html) |
| ☐ | ☐ | **Camp du Comte Razof** (id 104) | 190 | 1 | 1 | 0 | Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/camp-du-comte-razof.html) |
| ☐ | ☐ | **Donjon de la mine de Sakaï** (id 62) | 190 | 1 | 1 | 0 | Deuxième salle | [guide](https://www.dofuspourlesnoobs.com/donjon-de-la-mine-de-sakaiuml.html) |
| ☐ | ☐ | **Expédition de l'Audace - Donjon de la mine de Sakaï** (id 168) | 190 | 3 | 0 | 0 | — | — |
| ☐ | ☐ | **Pyramide d'Ombre** (id 74) | 190 | 2 | 2 | 0 | Salle 171182337, Sortie | [guide](https://www.dofuspourlesnoobs.com/pyramide-dombre.html) |
| ☐ | ☐ | **Aquadôme de Merkator** (id 73) | 200 | 3 | 1 | 2 | Aquadôme – Salle des Bulles, Aquadôme – Salle des Globes, Aquadôme – Salle des Trésors, Aquadôme – Salle du Bathyscaphe, Aquadôme – Salle du Périscope | [guide](https://www.dofuspourlesnoobs.com/aquadocircme-de-merkator.html) |
| ☐ | ☐ | **Arbre de Mort** (id 117) | 200 | 2 | 2 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/arbre-de-mort.html) |
| ☐ | ☐ | **Autel de la Déchireuse** (id 165) | 200 | 1 | 0 | 0 | — | [guide](https://www.dofuspourlesnoobs.com/autel-de-la-dechireuse.html) |
| ☐ | ☐ | **Bataille de l'Aurore Pourpre** (id 136) | 200 | 2 | 2 | 0 | Le Bois de la Liche, Le Chant du Nécromant | [guide](https://www.dofuspourlesnoobs.com/bataille-de-l-aurore-pourpre.html) |
| ☐ | ☐ | **Belvédère d'Ilyzaelle** (id 107) | 200 | 4 | 3 | 0 | Blessure d'Erazal, Blessure d'Erazal (sortie) | [guide](https://www.dofuspourlesnoobs.com/belvedere-d-ilyzaelle.html) |
| ☐ | ☐ | **Brasserie du roi Dazak** (id 110) | 200 | 3 | 2 | 0 | Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/brasserie-du-roi-dazak.html) |
| ☐ | ☐ | **Breuil du Vénérable** (id 164) | 200 | 2 | 2 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/breuil-du-venerable.html) |
| ☐ | ☐ | **Chambre de Tal Kasha** (id 103) | 200 | 2 | 2 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/chambre-de-tal-kasha.html) |
| ☐ | ☐ | **Chambre des maléfices** (id 140) | 200 | 1 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/chambre-des-malefices.html) |
| ☐ | ☐ | **Donjon du Comte Harebourg** (id 71) | 200 | 6 | 4 | 1 | Donjon du Comte - Grande aiguille, Salle non précisée | [guide](https://www.dofuspourlesnoobs.com/donjon-du-comte-harebourg.html) |
| ☐ | ☐ | **Défi du Chalœil** (id 95) | 200 | 5 | 5 | 0 | Salle Ivoirine | [guide](https://www.dofuspourlesnoobs.com/defi-du-chaloeil.html) |
| ☐ | ☐ | **Fers de la Tyrannie** (id 118) | 200 | 1 | 0 | 1 | — | [guide](https://www.dofuspourlesnoobs.com/fers-de-la-tyrannie.html) |
| ☐ | ☐ | **Forgefroide de Missiz Frizz** (id 69) | 200 | 4 | 0 | 3 | — | [guide](https://www.dofuspourlesnoobs.com/forgefroide-de-missiz-frizz.html) |
| ☐ | ☐ | **Laboratoire de Nileza** (id 70) | 200 | 7 | 5 | 1 | Salle de Nileza, Sortie | [guide](https://www.dofuspourlesnoobs.com/laboratoire-de-nileza.html) |
| ☐ | ☐ | **Manoir des Katrepat** (id 106) | 200 | 2 | 2 | 0 | Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/manoir-des-katrepat.html) |
| ☐ | ☐ | **Mémoire d'Orukam** (id 133) | 200 | 1 | 1 | 0 | Le Dofus | [guide](https://www.dofuspourlesnoobs.com/memoire-d-orukam.html) |
| ☐ | ☐ | **Palais de Dantinéa** (id 99) | 200 | 3 | 2 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/palais-de-dantineacutea.html) |
| ☐ | ☐ | **Palais du roi Nidas** (id 76) | 200 | 7 | 5 | 1 | Salle 129502208, Salle 132382720, Salle des coffres, Sortie | [guide](https://www.dofuspourlesnoobs.com/palais-du-roi-nidas.html) |
| ☐ | ☐ | **Rituel de Kabahal** (id 135) | 200 | 3 | 3 | 0 | Cinquième salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/rituel-de-kabahal.html) |
| ☐ | ☐ | **Salons privés de Klime** (id 68) | 200 | 5 | 2 | 2 | Troisième Salle, Quatrième Salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/salons-priveacutes-de-klime.html) |
| ☐ | ☐ | **Sanctuaire de Torkélonia** (id 114) | 200 | 1 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/sanctuaire-de-torkelonia.html) |
| ☐ | ☐ | **Sentence de la Balance** (id 119) | 200 | 1 | 1 | 0 | Salle 203427842 | [guide](https://www.dofuspourlesnoobs.com/sentence-de-la-balance.html) |
| ☐ | ☐ | **Souvenir d'Imagiro** (id 134) | 200 | 1 | 1 | 0 | Le Dofus | [guide](https://www.dofuspourlesnoobs.com/souvenir-d-imagiro.html) |
| ☐ | ☐ | **Temple de Koutoulou** (id 98) | 200 | 3 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/temple-de-koutoulou.html) |
| ☐ | ☐ | **Temple du dieu Kao** (id 111) | 200 | 2 | 1 | 1 | Sortie | [guide](https://www.dofuspourlesnoobs.com/temple-du-dieu-kao.html) |
| ☐ | ☐ | **Tour de Bethel** (id 108) | 200 | 3 | 2 | 1 | Salle du cœur livide, Tour de Bethel | [guide](https://www.dofuspourlesnoobs.com/tour-de-bethel.html) |
| ☐ | ☐ | **Tour de Solar** (id 109) | 200 | 2 | 2 | 0 | Cinquième salle, Salle du cœur livide | [guide](https://www.dofuspourlesnoobs.com/tour-de-solar.html) |
| ☐ | ☐ | **Transporteur de Sylargh** (id 67) | 200 | 5 | 2 | 2 | Troisième Salle, Sortie | [guide](https://www.dofuspourlesnoobs.com/transporteur-de-sylargh.html) |
| ☐ | ☐ | **Trône de Sang** (id 120) | 200 | 1 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/trone-de-sang.html) |
| ☐ | ☐ | **Trône de la Cour Sombre** (id 83) | 200 | 2 | 2 | 0 | Traversée, Salle du Trône - Sortie | [guide](https://www.dofuspourlesnoobs.com/trone-de-la-cour-sombre.html) |
| ☐ | ☐ | **Vaisseau du Capitaine Meno** (id 97) | 200 | 3 | 2 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/vaisseau-du-capitaine-meno.html) |
| ☐ | ☐ | **Ventre de la Baleine** (id 84) | 200 | 3 | 1 | 0 | Sortie | [guide](https://www.dofuspourlesnoobs.com/ventre-de-la-baleine.html) |
| ☐ | ☐ | **Œil de Vortex** (id 87) | 200 | 4 | 4 | 0 | Puits des âmes, Salle 143397377, Salle des heures perdues, Sortie | [guide](https://www.dofuspourlesnoobs.com/oeil-de-vortex.html) |
