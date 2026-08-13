// L'INSTANCE ADN FAMILY DU PLAYER DE DOCUMENTS — tout le code de ce dépôt.
//
// Le player est une dépendance npm, jamais une copie : `discovery-media-player`, dépôt
// public, AGPL-3.0. Une correction du cœur profite à toutes ses instances au déploiement
// suivant. Ce fichier ne fait que deux choses — construire le contexte, et déléguer.
//
// ⚠️ AUCUN SECRET ICI. Ce dépôt est public : c'est une obligation de l'AGPL, et c'est sain.
// Tout ce qui est confidentiel vit dans les variables d'environnement Vercel. Un câblage
// qu'on ne pourrait pas publier contiendrait quelque chose qui n'a rien à y faire.
//
// ⚠️ RIEN À REMPLACER DANS LE CONTEXTE. On avait prévu d'y réécrire `identity.canManageShares`
// et `branding.forKey` ; le contexte autonome les délègue déjà à deux routes de l'hôte,
// désignées par `PLAYER_HOST_AUTHZ_URL` et `PLAYER_HOST_BRAND_URL`. Nos routes existent et
// répondent au bon format. Configurer suffit — le code qu'on n'écrit pas ne diverge pas.
//
// ⚠️ VERSION ÉPINGLÉE À L'EXACT (voir package.json), jamais en `^`. Un accent circonflexe
// ferait arriver en production une version que personne n'a décidé de déployer — or la règle
// du contrat veut que le player parte AVANT ses hôtes, ce qui suppose quelqu'un pour décider.
// Monter de version est donc un commit ici, délibéré et relu.
//
// Ce fichier a un temps rempli lui-même `req.query` et `req.body` : le gestionnaire les lit
// (convention serverless) et un serveur HTTP nu ne les fournit pas — l'absence produisait une
// page « lien révoqué » au lieu d'une erreur de branchement. Corrigé dans le cœur depuis
// 0.1.4, qui retrouve les deux depuis la requête. On a donc retiré notre repli plutôt que de
// recopier un comportement qui vit désormais en amont.

const player = require("discovery-media-player");
const { createStandaloneContext } = require("discovery-media-player/context/standalone");

// Une seule construction par démarrage à froid. Le contexte lit l'environnement : rien de
// ce qui suit ne connaît ADV autrement que par des URL et un secret partagé.
player.init(createStandaloneContext(process.env));

module.exports = (req, res) => player.handler(req, res);
