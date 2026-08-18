#!/usr/bin/env node
// LA FORME DE `manquant`, LUE DANS LE PAQUET INSTALLÉ — jamais retapée.
//
// ⚠️ POURQUOI CE FICHIER EXISTE. Le cockpit d'ADV lit les entrées de `manquant` que rend
// `?contract=1&schema=1`. J'avais typé ces entrées DE MÉMOIRE — `{table, colonne, migration}`,
// par analogie avec ce qu'une sonde de colonne « devrait » rendre. Le player rend
// `{migration, fonction}`. Le filtre d'ADV jetait donc CHAQUE migration manquante en silence,
// et l'essai unitaire passait : il fabriquait la carte à ma façon, donc il validait ma
// supposition au lieu du comportement.
//
// ⚠️ AUCUNE MUTATION NE POUVAIT L'ATTRAPER : le banc et le code portaient la même erreur. Une
// mutation survivante signale une zone mal couverte ; une erreur PARTAGÉE ne signale rien du
// tout. Le seul remède connu est une source extérieure aux deux — c'est ce fichier.
//
// ⚠️ ET RECOPIER, C'EST REFABRIQUER. Un exemplaire retapé à la main depuis la documentation
// redevient le mien à l'instant où je le retape. Celui-ci est LU À L'EXÉCUTION dans
// `node_modules`, donc il change quand le paquet change — c'est tout l'intérêt.
//
// Ce que ce contrôle NE fait pas : il ne voit pas le code d'ADV, qui vit dans un autre dépôt.
// Il fige la forme attendue là où le paquet est une vraie dépendance, et rougit à la montée de
// version suivante si elle bouge — c'est-à-dire au moment précis où quelqu'un regarde.
//
// Usage : node verifier-contrat.mjs

import { readFileSync } from "node:fs";

const CONTRAT = "node_modules/discovery-media-player/docs/HOST-CONTRACT.md";

// Les clés que le cockpit d'ADV sait lire (app/api/cron/player-schema/route.ts).
// Une clé nouvelle n'est pas une erreur ; une clé DISPARUE en est une.
const LUES_PAR_ADV = ["migration", "fonction"];

let texte;
try {
  texte = readFileSync(CONTRAT, "utf8");
} catch {
  console.error(`✗ contrat introuvable : ${CONTRAT} — le paquet est-il installé ?`);
  process.exit(1);
}

// L'exemplaire est le bloc JSON qui suit « exactly this shape ». On ne cherche pas « un bloc
// json » au hasard : le contrat en contient plusieurs, et prendre le premier venu ferait un
// contrôle qui passe en mesurant autre chose.
const apres = texte.split(/exactly this shape/i)[1];
if (!apres) {
  console.error("✗ le contrat ne porte pas d'exemplaire de `manquant` (« exactly this shape » absent).");
  console.error("  Avant 0.1.61 il n'y en avait pas : la forme n'était écrite nulle part, et c'est");
  console.error("  précisément ce qui a produit le défaut que ce fichier existe pour empêcher.");
  process.exit(1);
}
const bloc = apres.match(/```json\s*([\s\S]*?)```/);
if (!bloc) {
  console.error("✗ « exactly this shape » trouvé, mais aucun bloc JSON derrière.");
  process.exit(1);
}

let exemplaire;
try {
  exemplaire = JSON.parse(bloc[1]);
} catch (e) {
  console.error(`✗ l'exemplaire du contrat n'est pas du JSON valide : ${e.message}`);
  process.exit(1);
}

const clefs = Object.keys(exemplaire).sort();
const manquantes = LUES_PAR_ADV.filter((k) => !clefs.includes(k));

if (manquantes.length) {
  console.error(`✗ LE CONTRAT A CHANGÉ DE FORME. Le cockpit d'ADV lit ${manquantes.map((k) => `\`${k}\``).join(", ")}, absent(es) de l'exemplaire.`);
  console.error(`  exemplaire livré : { ${clefs.join(", ")} }`);
  console.error("  → corriger app/api/cron/player-schema/route.ts dans le dépôt ADV AVANT de déployer cette version.");
  process.exit(1);
}

const nouvelles = clefs.filter((k) => !LUES_PAR_ADV.includes(k));
console.log(`✓ forme de \`manquant\` conforme : { ${clefs.join(", ")} }`);
if (nouvelles.length) console.log(`  (champs nouveaux, non lus par ADV — sans danger : ${nouvelles.join(", ")})`);
