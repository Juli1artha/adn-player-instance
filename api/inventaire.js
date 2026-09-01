// L'INVENTAIRE DES DONNÉES DE LA BASE DU PLAYER — la sonde que le cockpit ADV interroge.
//
// Pourquoi ce fichier existe : un fournisseur qui crée des tables chez nous crée une zone que
// nos inventaires ne visitent pas. Constat du 01/09/2026 sur cette base : dix tables, dont
// quatre à données personnelles (destinataires des liens tracés, sessions des membres,
// participants aux présentations) — aucune ne figurait dans un audit ou un écran ADV. La base
// est celle de l'hôte, mais seul CE projet Vercel en détient la clé service_role :
// l'inventaire ne peut donc vivre qu'ici.
//
// ⚠️ AGRÉGATS SEULEMENT. La réponse porte des noms de tables, des noms de colonnes et des
// comptages — jamais une ligne, jamais une valeur. Y faire entrer une donnée serait un
// changement de nature, pas de degré : nouvel arbitrage côté hôte.
//
// ⚠️ L'INVENTAIRE EST DÉRIVÉ DU SCHÉMA VIVANT (l'OpenAPI de PostgREST), jamais d'une liste
// recopiée : une table qu'un train du player créerait demain apparaît d'elle-même. La liste
// des tables « connues », elle, vit côté ADV (lib/player-donnees.ts) — c'est là qu'un écart
// doit sonner, pas ici : la sonde balaie, le référentiel juge.
//
// ⚠️ SECRET DÉDIÉ (`PLAYER_HOST_INVENTAIRE_SECRET`), à poser sur ce projet ET sur ADV, puis à
// redéployer les deux (une variable Vercel ne prend effet qu'au déploiement suivant). Jamais
// un secret existant réemployé : un secret ne suit ni un changement de destinataire, ni un
// changement de direction — ici c'est ADV qui interroge l'instance, le sens inverse du fetch.
//
// ⚠️ V2 — L'ATTESTATION DE PURGE EST LUE DANS LA BASE. Les migrations de purge du player
// (0026/0027) posent un COMMENTAIRE sur les colonnes vidées (« le signe qu'un hôte peut
// sonder », dit la 0026) ; PostgREST l'expose en `description` dans son OpenAPI. La sonde le
// remonte tel quel (`commentaires`) — c'est côté ADV que « valeurs présentes + purge
// attestée » devient une alarme. Et parce qu'un détecteur d'absence est confondable avec sa
// propre panne, `commentaires_exposes` compte TOUTES les colonnes décrites de la base : la
// base en porte depuis sa naissance (idem_key, write_seq…), donc zéro signifie « le véhicule
// est mort », jamais « rien à lire ».

const crypto = require("crypto");

// Colonnes dont le NOM évoque une donnée personnelle. Heuristique volontairement large : le
// drapeau invite à examiner, il ne juge pas. `file_name` en est exclue explicitement — elle
// dit la nature d'un document, pas une identité.
const SENSIBLE = /(email|(^|_)ip($|_)|ip_hash|user_agent|(^|_)ua($|_)|(^|_)name($|_)|(^|_)nom($|_)|phone|telephone|address|adresse)/i;
const EXCLUES = new Set(["file_name"]);

// Colonnes comptées valeur par valeur : l'état de la rétention. Les `_hash` n'en sont pas
// (pseudonymisées à la source, HMAC) — c'est la valeur EN CLAIR qui doit tomber à zéro.
const A_COMPTER = /((^|_)ip($|_)|user_agent|(^|_)ua($|_))/i;

function autorise(req, secret) {
  const recu = Buffer.from(String(req.headers.authorization || ""));
  const attendu = Buffer.from(`Bearer ${secret}`);
  return recu.length === attendu.length && crypto.timingSafeEqual(recu, attendu);
}

module.exports = async (req, res) => {
  res.setHeader("content-type", "application/json; charset=utf-8");
  const repond = (code, corps) => { res.statusCode = code; res.end(JSON.stringify(corps)); };

  const secret = process.env.PLAYER_HOST_INVENTAIRE_SECRET;
  const base = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret || !base || !cle) return repond(503, { ok: false, error: "non_configure" });
  if (!autorise(req, secret)) return repond(401, { ok: false, error: "non_autorise" });

  const entetes = { apikey: cle, authorization: `Bearer ${cle}` };

  // Le comptage passe par `Content-Range` (HEAD + count=exact), jamais par une liste
  // rapatriée puis mesurée — une liste tronquée a exactement la même forme qu'une complète.
  async function compter(table, filtre) {
    const r = await fetch(`${base}/rest/v1/${table}?select=*${filtre ? `&${filtre}` : ""}`, {
      method: "HEAD",
      headers: { ...entetes, prefer: "count=exact", range: "0-0" },
      signal: AbortSignal.timeout(8000),
    });
    const total = (r.headers.get("content-range") || "").split("/")[1];
    if (!r.ok || total === undefined || total === "*") {
      throw new Error(`${table} : comptage illisible (HTTP ${r.status})`);
    }
    return Number(total);
  }

  try {
    const r = await fetch(`${base}/rest/v1/`, { headers: entetes, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return repond(502, { ok: false, error: `openapi HTTP ${r.status}` });
    const spec = await r.json();
    const defs = spec && spec.definitions;
    if (!defs || typeof defs !== "object" || Object.keys(defs).length === 0) {
      // Zéro relation rendue n'est pas « base vide » : cette base porte dix tables depuis sa
      // naissance. C'est la sonde qui n'a pas vu — et un vide pris pour un état ferait
      // conclure « rien à auditer » sur la panne même qu'on surveille.
      return repond(502, { ok: false, error: "openapi sans definitions — rien d'inventorié" });
    }

    // L'auto-test du véhicule : combien de colonnes, toutes tables confondues, portent une
    // description dans l'OpenAPI. Sert de contrôle positif côté ADV.
    let commentairesExposes = 0;

    const tables = await Promise.all(Object.keys(defs).sort().map(async (nom) => {
      const props = defs[nom].properties || {};
      const colonnes = Object.keys(props);
      commentairesExposes += colonnes.filter((c) => typeof props[c].description === "string" && props[c].description).length;
      const sensibles = colonnes.filter((c) => !EXCLUES.has(c) && SENSIBLE.test(c));
      const aCompter = sensibles.filter((c) => A_COMPTER.test(c) && !/hash/i.test(c));
      const [lignes, ...comptes] = await Promise.all([
        compter(nom),
        ...aCompter.map((c) => compter(nom, `${c}=not.is.null`)),
      ]);
      const restants = {};
      const commentaires = {};
      aCompter.forEach((c, i) => {
        restants[c] = comptes[i];
        if (typeof props[c].description === "string" && props[c].description) commentaires[c] = props[c].description;
      });
      return { nom, lignes, colonnes, sensibles, restants, commentaires };
    }));

    return repond(200, {
      ok: true, releve_le: new Date().toISOString(),
      commentaires_exposes: commentairesExposes, tables,
    });
  } catch (e) {
    return repond(502, { ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
