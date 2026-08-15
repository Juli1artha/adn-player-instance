// EST-CE QUE LA PAGE SERVIE EST DU JAVASCRIPT VALIDE ?
//
// ⚠️ À LANCER APRÈS CHAQUE MONTÉE DE VERSION. La 0.1.25 a été publiée avec une erreur de
// syntaxe dans son script en ligne (`return var h2={…}`) : le bloc entier ne compilait plus,
// donc plus de chat, plus de présence, plus de relecture d'état. La couche live était morte,
// et rien côté serveur ne le disait — la page se sert parfaitement, c'est le navigateur qui
// refuse de l'exécuter.
//
// Analyser et exécuter sont deux questions séparées : `vm.Script` répond à la première sans
// avoir besoin d'une seule dépendance, d'un DOM, ni d'un navigateur.
//
//   node verifier-script-servi.mjs https://doc.adnfamily.com/doc/<slug>
import vm from "node:vm";

const url = process.argv[2];
if (!url) { console.error("usage : node verifier-script-servi.mjs <url>"); process.exit(2); }

const html = await fetch(url).then((r) => r.text());
const blocs = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1]).filter((s) => s.trim());

let casses = 0;
blocs.forEach((code, i) => {
  try { new vm.Script(code); } catch (e) {
    casses++;
    console.error(`✗ bloc ${i + 1}/${blocs.length} — ${e.message}`);
  }
});
console.log(casses ? `${casses} bloc(s) illisible(s) sur ${blocs.length}` : `✓ ${blocs.length} blocs, tous analysables`);
process.exit(casses ? 1 : 0);
