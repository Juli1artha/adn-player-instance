# Instance ADN FAMILY du player de documents

Ce dépôt fait tourner **`doc.adnfamily.com`** : la visionneuse qui sert les documents partagés
par [ADN FAMILY](https://adnfamily.com/), avec suivi de lecture et présentation en direct.

Il ne contient **aucune** de ces fonctionnalités. Elles vivent dans
[`discovery-media-player`](https://www.npmjs.com/package/discovery-media-player), installé
comme dépendance. Ce dépôt-ci est le **câblage** : trois fichiers qui disent où trouver la
base, quelles routes appeler pour les droits et la marque, et quelles adresses servir.

## Pourquoi si peu de code

Le player est une page HTML rendue par une fonction serveur, sans dépendance de framework.
Une même source, plusieurs instances : une correction du cœur profite à toutes au
déploiement suivant, sans que personne ait à reprendre quoi que ce soit.

C'est la raison d'être de ce dépôt minuscule. **On ne copie pas de code** — le précédent est
documenté chez l'éditeur du player : un même programme recopié dans quatre dépôts, dont trois
servaient une version périmée sans que personne ne le voie.

## Ce qu'il y a dedans

| Fichier | Rôle |
|---|---|
| `api/doc.js` | construit le contexte depuis l'environnement, puis délègue au player |
| `vercel.json` | `/doc/:slug` et `/present/:slug` → la fonction |
| `package.json` | la dépendance, **épinglée à l'exact** |

### La version est épinglée, sans accent circonflexe

`"discovery-media-player": "0.1.7"`, pas `"^0.1.7"`.

Le player se déploie **avant** ses applications hôtes — l'inverse fait disparaître une
fonctionnalité partout d'un coup, sans erreur visible. Cet ordre suppose que quelqu'un décide
quand. Un accent circonflexe ferait arriver en production, au prochain déploiement, une
version que personne n'a choisie.

Monter de version est donc un commit ici, délibéré, relu.

## Configuration

Aucun secret dans ce dépôt : tout vit dans les variables d'environnement Vercel. C'est une
obligation de l'AGPL, et c'est une bonne contrainte — **un câblage qu'on ne pourrait pas
publier contiendrait quelque chose qui n'a rien à y faire.**

| Variable | Rôle |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | la base **dédiée** de l'instance |
| `PLAYER_HOST_FETCH_BASE` | préfixe d'URL de la route de fichiers de l'hôte — ⚠️ **barre finale comprise** |
| `PLAYER_HOST_FETCH_SECRET` | secret partagé avec l'hôte, en en-tête, jamais en query |
| `PLAYER_HOST_AUTHZ_URL` | qui a le droit de diffuser — répond l'hôte, pas le player |
| `PLAYER_HOST_BRAND_URL` | la marque d'un document, résolue par clé à l'affichage |
| `PLAYER_BRAND_NAME`, `PLAYER_BRAND_POWERED_BY` | l'identité de l'exploitant |
| `DOC_FRAME_ANCESTORS` | les domaines autorisés à encadrer la visionneuse |
| `PLAYER_SOURCE_URL` | lien « code source » montré aux lecteurs — **obligation AGPL** |

Sans `PLAYER_HOST_AUTHZ_URL`, personne ne peut diffuser de document. Ce n'est pas une panne :
un droit qu'on ne sait pas accorder ne s'accorde pas.

## Licence

AGPL-3.0-or-later, comme le player qu'il fait tourner. L'AGPL couvre aussi ceux qui
**utilisent** le logiciel à travers un réseau : toute personne qui lit un document servi par
cette instance peut en obtenir le code source.
