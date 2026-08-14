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

`"discovery-media-player": "0.1.12"`, pas `"^0.1.12"`.

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
| `PLAYER_AUTH_URL`, `PLAYER_AUTH_KEY` | ⚠️ le projet Supabase qui ÉMET les jetons des membres — celui de l'application hôte, **pas** celui ci-dessus. Deux rôles, deux variables : la base appartient à l'instance, l'identité appartient à l'hôte. `PLAYER_AUTH_KEY` n'a **aucun repli** : une clé qui suivrait un changement de destinataire enverrait un secret au mauvais projet. |
| `PLAYER_HOST_FETCH_BASE` | préfixe d'URL de la route de fichiers de l'hôte — ⚠️ **barre finale comprise** |
| `PLAYER_HOST_FETCH_SECRET` | secret partagé avec l'hôte, en en-tête, jamais en query |
| `PLAYER_HOST_AUTHZ_URL` | qui a le droit de diffuser — répond l'hôte, pas le player |
| `PLAYER_HOST_SHARE_SECRET` | ⚠️ secret **distinct** de `PLAYER_HOST_FETCH_SECRET`, et dans l'autre sens : il autorise l'hôte à faire CRÉER un lien tracé. Le premier ne circule que vers l'hôte, à chaque fichier — il vit donc dans ses journaux ; lui donner en plus le droit d'écrire ici ferait dépendre l'intégrité des liens de la rétention de journaux d'un tiers. Un secret ne suit ni un changement de destinataire, ni un changement de direction. |
| `PLAYER_HOST_BRAND_URL` | la marque d'un document, résolue par clé à l'affichage |
| `PLAYER_BRAND_NAME` | l'identité de l'exploitant |
| `PLAYER_BRAND_POWERED_BY` | ⚠️ **volontairement vide.** Cette mention s'affiche sous le logo de marque, et elle est posée par INSTANCE alors que le logo, lui, est résolu par LIEN (`PLAYER_HOST_BRAND_URL`). Or cette instance sert deux domaines et deux marques : tout texte fixé ici est donc juste pour l'une et faux pour l'autre. Un visiteur de la carte publique lisait « Powered by ADN FAMILY » sous un logo ValoNeuf, sans savoir ce qu'est ADN Family. Demandé au studio de la rattacher à la marque, à côté de `logo`, `name` et `dark`. La vider ne coûte rien : sur un document interne, le logo était déjà celui d'ADN Family. |
| `DOC_FRAME_ANCESTORS` | les domaines autorisés à encadrer la visionneuse |
| `PLAYER_SOURCE_URL` | lien « code source » montré aux lecteurs — **obligation AGPL** |

⚠️ **Une variable vidée sur Vercel ne prend effet qu'au déploiement suivant.** Elle est lue à
l'exécution par la fonction, mais l'ancienne valeur reste dans l'environnement du
déploiement en cours : tant qu'aucun nouveau n'est sorti, la page continue de la servir. On
l'a constaté ici même, en relisant le HTML d'un lien après avoir vidé le champ.

Sans `PLAYER_HOST_AUTHZ_URL`, personne ne peut diffuser de document. Ce n'est pas une panne :
un droit qu'on ne sait pas accorder ne s'accorde pas.

## Licence

AGPL-3.0-or-later, comme le player qu'il fait tourner. L'AGPL couvre aussi ceux qui
**utilisent** le logiciel à travers un réseau : toute personne qui lit un document servi par
cette instance peut en obtenir le code source.
