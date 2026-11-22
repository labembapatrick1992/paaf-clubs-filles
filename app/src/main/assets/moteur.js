/* Moteur de calcul du tableau de bord « PAAF Clubs Filles ».
   Entrée : le contenu de tableau_de_bord.json (produit par scto_vers_tableau.py) et les filtres choisis.
   Sortie : des lignes prêtes à afficher. Utilisé à l'identique par la page en ligne et par l'application. */
(function (global) {
  "use strict";

  var LIB = {
    methode: { groupe: "Travaux de groupe", expose: "Exposé participatif", jeu_role: "Jeu de rôle", debat: "Débat", cartographie: "Cartographie",
      etude_cas: "Étude de cas", brainstorm: "Brainstorming", art: "Art et culture", sport: "Sport et jeux", boite: "Boîte à questions" },
    difficulte: { materiel: "Manque de matériel", espace: "Espace indisponible", temps: "Temps insuffisant", absences: "Absences",
      parents: "Réticences de parents", comprehension: "Contenu difficile", meteo: "Pluie / météo", autre: "Autre", aucune: "Aucune difficulté" },
    action: { pedagogie: "Pédagogie", participation: "Participation", protection: "Protection", logistique: "Logistique / matériel",
      donnees: "Qualité des données", communaute: "Parents / communauté" },
    critere: { c_prep: "Préparation avec la fiche", c_obj: "Objectifs annoncés", c_methode: "Méthodes participatives", c_particip: "Toutes participent",
      c_inclusion: "Inclusion du handicap", c_langue: "Langage adapté", c_temps: "Gestion du temps", c_climat: "Climat sûr et confidentiel",
      c_messages: "Messages d'orientation", c_eval: "Vérification des acquis" },
    module: { M1: "M1 Socio-émotionnel", M2: "M2 Leadership", M3: "M3 Économie", M4: "M4 Santé, bien-être", M5: "M5 Genre et VBG" },
    classe: { "7EB": "7e EB", "8EB": "8e EB", "1H": "1re Humanités", "2H": "2e Humanités", "3H": "3e Humanités", "4H": "4e Humanités" },
    vulnerabilite: { orpheline: "Orpheline", mere: "Mère adolescente", deplacee: "Déplacée interne", charge: "Responsable de frères/sœurs",
      minorite: "Groupe minoritaire", aucune: "Aucune / non déclarée" },
    niveau: { central: "Maîtres formateurs (central)", provincial: "Formateurs provinciaux", animatrice: "Animatrices" },
    tranche: { A: "12-14 ans", B: "15-18 ans" }
  };
  var CIBLES_FORMATION = { central: null, provincial: 80, animatrice: 800 };
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  function objets(t) {
    if (!t || !t.columns) return [];
    return t.rows.map(function (r) { var o = {}; t.columns.forEach(function (c, i) { o[c] = r[i]; }); return o; });
  }
  function n(v) { var x = +v; return isFinite(x) ? x : 0; }
  function somme(rs, k) { var s = 0; rs.forEach(function (r) { s += n(r[k]); }); return s; }
  function pct(a, b) { return b > 0 ? Math.round(a / b * 1000) / 10 : null; }
  function moy(xs) { xs = xs.filter(function (x) { return x != null && isFinite(x); }); return xs.length ? Math.round(xs.reduce(function (a, b) { return a + b; }, 0) / xs.length * 10) / 10 : null; }
  function lib(dict, k) { return (LIB[dict] && LIB[dict][k]) || k; }

  var cache = { src: null, prep: null };
  function preparer(tdb) {
    if (cache.src === tdb && cache.prep) return cache.prep;
    var clubs = objets(tdb && tdb.clubs), cm = objets(tdb && tdb.club_mois);
    var parClub = {}; clubs.forEach(function (c) { parClub[c.club] = c; });
    var mois = Array.from(new Set(cm.map(function (r) { return r.mois; }))).sort();
    var profil = objets(tdb && tdb.profil);
    var inscritesClub = {}, handiClub = {};
    profil.forEach(function (p) { if (p.dimension === "handicap") { inscritesClub[p.club] = (inscritesClub[p.club] || 0) + n(p.n); if (p.valeur === "oui") handiClub[p.club] = (handiClub[p.club] || 0) + n(p.n); } });
    var prep = { clubs: clubs, parClub: parClub, cm: cm, mois: mois, profil: profil, inscritesClub: inscritesClub, handiClub: handiClub,
      formation: objets(tdb && tdb.formation), enquete: objets(tdb && tdb.enquete),
      parametres: (tdb && tdb.parametres) || { cible_ecoles: 400, cible_clubs: 800, cible_filles: 20000, ua_total: 30, ua_par_module: { M1: 6, M2: 5, M3: 6, M4: 6, M5: 7 } },
      maj: tdb && tdb.maj };
    cache = { src: tdb, prep: prep };
    return prep;
  }

  function clubsFiltres(p, f) {
    f = f || {};
    return p.clubs.filter(function (c) {
      return (!f.province || c.province === f.province) && (!f.milieu || c.milieu === f.milieu) && (!f.cohorte || c.cohorte === f.cohorte)
        && (!f.tranche || c.tranche === f.tranche) && (!f.superviseure || c.superviseure === f.superviseure) && (!f.ecole || c.ecole === f.ecole);
    });
  }
  function moisChoisi(p, f) { return (f && f.mois && p.mois.indexOf(f.mois) >= 0) ? f.mois : p.mois[p.mois.length - 1]; }
  function moisPrecedent(p, m) { var i = p.mois.indexOf(m); return i > 0 ? p.mois[i - 1] : null; }
  function lignes(p, ids, m) { return p.cm.filter(function (r) { return r.mois === m && ids[r.club]; }); }
  function ensemble(cs) { var o = {}; cs.forEach(function (c) { o[c.club] = true; }); return o; }
  function opsAu(cs, m) { return cs.filter(function (c) { return n(c.operationnel) === 1 && (!c.debut || c.debut <= m); }); }

  function indicateurs(p, cs, rs, m) {
    var ops = opsAu(cs, m), idsOps = ensemble(ops);
    var rsOps = rs.filter(function (r) { return idsOps[r.club]; });
    var realPlaf = 0; rs.forEach(function (r) { realPlaf += Math.min(n(r.seances_realisees), n(r.seances_prevues)); });
    var ecarts = rs.filter(function (r) { return r.ecart_presence != null; });
    var cons = rs.filter(function (r) { return r.consent_complets != null; }), reg = rs.filter(function (r) { return r.registre_secu != null; });
    var inst = cs.filter(function (c) { return n(c.installe) === 1; });
    var filles = 0, handi = 0; cs.forEach(function (c) { filles += p.inscritesClub[c.club] || 0; handi += p.handiClub[c.club] || 0; });
    var obs = somme(rs, "obs");
    return {
      mois: m, clubs_installes: inst.length, clubs_ops: ops.length,
      ecoles_actives: new Set(ops.map(function (c) { return c.ecole; })).size,
      filles: filles, handicap_pct: pct(handi, filles),
      exec_pct: pct(realPlaf, somme(rs, "seances_prevues")), seances: somme(rs, "seances_realisees"),
      part_pct: pct(somme(rs, "presences"), somme(rs, "presences_possibles")),
      part_h_pct: pct(somme(rs, "presences_handicap"), somme(rs, "presences_possibles_handicap")),
      assid_pct: pct(somme(rs, "assidues"), somme(rs, "inscrites")),
      assid_h_pct: pct(somme(rs, "assidues_handicap"), somme(rs, "inscrites_handicap")),
      sup_pct: pct(somme(rsOps, "supervise"), ops.length),
      qual_moy: moy(rs.map(function (r) { return r.score_qualite_pct == null ? null : n(r.score_qualite_pct); })),
      complet_pct: pct(somme(rs, "rapports_recus"), somme(rs, "rapports_attendus")),
      ponct_pct: pct(somme(rs, "rapports_a_temps"), somme(rs, "rapports_recus")),
      concord_pct: pct(ecarts.filter(function (r) { return n(r.ecart_presence) <= 1; }).length, ecarts.length),
      ua_pct: moy(rsOps.map(function (r) { return n(r.ua_couvertes) / (p.parametres.ua_total || 30) * 100; })),
      duree_moy: pct(somme(rs, "duree_totale"), somme(rs, "seances_realisees") * 100),
      gratuite_pct: pct(somme(rs, "seances_gratuites"), somme(rs, "seances_realisees")),
      collation_pct: pct(somme(rs, "seances_collation"), somme(rs, "seances_realisees")),
      protocole_pct: pct(somme(rs, "protocole_oui"), somme(rs, "protocole_oui") + somme(rs, "protocole_non")),
      protocole_cas: somme(rs, "protocole_oui") + somme(rs, "protocole_non"),
      consent_pct: pct(cons.filter(function (r) { return n(r.consent_complets) === 1; }).length, cons.length),
      registre_pct: pct(reg.filter(function (r) { return n(r.registre_secu) === 1; }).length, reg.length),
      sans_hommes_pct: pct(inst.filter(function (c) { return n(c.sans_hommes) === 1; }).length, inst.length),
      actions_nouvelles: somme(rs, "actions_nouvelles"),
      actions_cloture_pct: pct(somme(rs, "actions_closes"), somme(rs, "actions_precedentes")),
      obs: obs
    };
  }

  var CLES_DELTA = ["clubs_ops", "exec_pct", "part_pct", "part_h_pct", "assid_pct", "sup_pct", "qual_moy", "complet_pct", "ponct_pct", "ua_pct", "gratuite_pct", "consent_pct"];

  var M = {
    LIB: LIB, MOIS: MOIS, lib: lib,
    moisLabel: function (m) { if (!m) return ""; var s = String(m).split("-"); return MOIS[+s[1] - 1] + " " + s[0]; },
    moisCourt: function (m) { var s = String(m).split("-"); return MOIS[+s[1] - 1].slice(0, 4) + ". " + s[0].slice(2); },
    preparer: preparer,

    options: function (tdb) {
      var p = preparer(tdb), out = [];
      p.mois.slice().reverse().forEach(function (m) { out.push({ filtre: "mois", valeur: m, label: M.moisLabel(m) }); });
      ["province", "milieu", "cohorte", "tranche", "superviseure", "ecole"].forEach(function (k) {
        Array.from(new Set(p.clubs.map(function (c) { return c[k]; }).filter(Boolean))).sort().forEach(function (v) {
          out.push({ filtre: k, valeur: v, label: k === "tranche" ? "Clubs " + lib("tranche", v) : v });
        });
      });
      return out;
    },

    kpi: function (tdb, f) {
      var p = preparer(tdb); if (!p.mois.length) return [];
      var cs = clubsFiltres(p, f), ids = ensemble(cs), m = moisChoisi(p, f), mp = moisPrecedent(p, m);
      var cur = indicateurs(p, cs, lignes(p, ids, m), m);
      var prev = mp ? indicateurs(p, cs, lignes(p, ids, mp), mp) : null;
      cur.mois_precedent = mp;
      cur.mois_label = M.moisLabel(m);
      cur.cible_ecoles = p.parametres.cible_ecoles; cur.cible_clubs = p.parametres.cible_clubs; cur.cible_filles = p.parametres.cible_filles;
      CLES_DELTA.forEach(function (k) { cur["d_" + k] = prev && cur[k] != null && prev[k] != null ? Math.round((cur[k] - prev[k]) * 10) / 10 : null; });
      return [cur];
    },

    mensuel: function (tdb, f) {
      var p = preparer(tdb), cs = clubsFiltres(p, f), ids = ensemble(cs);
      return p.mois.map(function (m) { var k = indicateurs(p, cs, lignes(p, ids, m), m); k.mois_court = M.moisCourt(m); return k; });
    },

    alertes: function (tdb, f) {
      var p = preparer(tdb); if (!p.mois.length) return [];
      var cs = clubsFiltres(p, f), m = moisChoisi(p, f), ops = ensemble(opsAu(cs, m)), out = [];
      var rs = lignes(p, ensemble(cs), m), parClubLigne = {};
      rs.forEach(function (r) { parClubLigne[r.club] = r; });
      Object.keys(ops).forEach(function (cid) {
        var r = parClubLigne[cid], c = p.parClub[cid];
        if (!r || n(r.seances_realisees) === 0) out.push({ id: "seance-" + cid, gravite: 1, type: "Aucune séance ce mois", cible: cid, detail: c.superviseure || "superviseure non renseignée", valeur: null });
      });
      rs.forEach(function (r) {
        var c = p.parClub[r.club], part = pct(n(r.presences), n(r.presences_possibles));
        if (part != null && part < 60) out.push({ id: "part-" + r.club, gravite: 2, type: "Participation faible", cible: r.club, detail: c.superviseure || "—", valeur: part });
        if (n(r.seances_realisees) > n(r.seances_gratuites)) out.push({ id: "gratuite-" + r.club, gravite: 1, type: "Contribution demandée aux filles", cible: r.club, detail: c.superviseure || "—", valeur: n(r.seances_realisees) - n(r.seances_gratuites) });
        if (r.consent_complets != null && n(r.consent_complets) === 0) out.push({ id: "consent-" + r.club, gravite: 2, type: "Consentements incomplets", cible: r.club, detail: c.superviseure || "—", valeur: null });
      });
      var retard = {};
      Object.keys(ops).forEach(function (cid) { var r = parClubLigne[cid]; if (!r || n(r.supervise) === 0) { var s = p.parClub[cid].superviseure || "Non attribuée"; retard[s] = (retard[s] || 0) + 1; } });
      Object.keys(retard).forEach(function (s) { out.push({ id: "visite-" + s, gravite: 3, type: "Clubs non visités ce mois", cible: s, detail: "superviseure", valeur: retard[s] }); });
      return out.sort(function (a, b) { return a.gravite - b.gravite || String(a.cible).localeCompare(String(b.cible)); }).slice(0, 40);
    },

    ecoles: function (tdb, f) {
      var p = preparer(tdb), cs = clubsFiltres(p, f), m = moisChoisi(p, f), rs = lignes(p, ensemble(cs), m), parClubLigne = {};
      rs.forEach(function (r) { parClubLigne[r.club] = r; });
      var groupes = {};
      cs.forEach(function (c) { (groupes[c.ecole] = groupes[c.ecole] || []).push(c); });
      return Object.keys(groupes).sort().map(function (e) {
        var g = groupes[e], coords = g.filter(function (c) { return c.lat != null && c.lon != null; });
        var ops = g.filter(function (c) { return n(c.operationnel) === 1 && (!c.debut || c.debut <= m); });
        var rg = g.map(function (c) { return parClubLigne[c.club]; }).filter(Boolean);
        var part = pct(somme(rg, "presences"), somme(rg, "presences_possibles"));
        var alerte = ops.some(function (c) { var r = parClubLigne[c.club]; return !r || n(r.seances_realisees) === 0; }) || (part != null && part < 60);
        var filles = 0; g.forEach(function (c) { filles += p.inscritesClub[c.club] || 0; });
        var visites = rg.filter(function (r) { return n(r.supervise) === 1; }).length;
        return { ecole: e, province: g[0].province, milieu: g[0].milieu,
          lat: coords.length ? moy(coords.map(function (c) { return n(c.lat); })) : null, lon: coords.length ? moy(coords.map(function (c) { return n(c.lon); })) : null,
          clubs: g.length, clubs_ops: ops.length, filles: filles, part_pct: part, visites: visites,
          etat: alerte ? "alerte" : ops.length >= 2 ? "deux" : ops.length === 1 ? "un" : "aucun" };
      });
    },

    clubs: function (tdb, f) {
      var p = preparer(tdb), cs = clubsFiltres(p, f), m = moisChoisi(p, f), rs = lignes(p, ensemble(cs), m), parClubLigne = {};
      rs.forEach(function (r) { parClubLigne[r.club] = r; });
      return cs.map(function (c) {
        var r = parClubLigne[c.club] || {};
        return { club: c.club, ecole: c.ecole, tranche: lib("tranche", c.tranche), superviseure: c.superviseure || "—",
          etat: n(c.operationnel) === 1 ? "Opérationnel" : n(c.installe) === 1 ? "Non opérationnel" : "Non installé",
          inscrites: p.inscritesClub[c.club] || 0, seances: r.seances_realisees != null ? n(r.seances_realisees) : null, prevues: r.seances_prevues != null ? n(r.seances_prevues) : null,
          part_pct: pct(n(r.presences), n(r.presences_possibles)), assid_pct: pct(n(r.assidues), n(r.inscrites)),
          ua: r.ua_couvertes != null ? n(r.ua_couvertes) : null, qualite: r.score_qualite_pct != null ? n(r.score_qualite_pct) : null };
      }).sort(function (a, b) { return (a.part_pct == null ? 999 : a.part_pct) - (b.part_pct == null ? 999 : b.part_pct); });
    },

    modules: function (tdb, f) {
      var p = preparer(tdb); if (!p.mois.length) return [];
      var cs = clubsFiltres(p, f), m = moisChoisi(p, f), ops = ensemble(opsAu(cs, m));
      var rs = lignes(p, ops, m), upm = p.parametres.ua_par_module;
      return Object.keys(upm).map(function (mod) {
        return { module: mod, label: lib("module", mod), ua_total: upm[mod],
          couverture_pct: moy(rs.map(function (r) { return n(r["ua_" + mod]) / upm[mod] * 100; })), seances: somme(rs, "mod_" + mod) };
      });
    },

    comptes: function (tdb, f, type) {
      var p = preparer(tdb); if (!p.mois.length) return [];
      var pref = { methode: "meth_", difficulte: "diff_", action: "act_" }[type];
      var cs = clubsFiltres(p, f), m = moisChoisi(p, f), rs = lignes(p, ensemble(cs), m);
      var base = type === "action" ? null : somme(rs, "seances_realisees");
      return Object.keys(LIB[type]).map(function (k) { var v = somme(rs, pref + k); return { cle: k, label: lib(type, k), n: v, pct: base ? pct(v, base) : null }; })
        .filter(function (r) { return r.n > 0 && r.cle !== "aucune"; }).sort(function (a, b) { return b.n - a.n; });
    },

    profil: function (tdb, f, dimension) {
      var p = preparer(tdb), ids = ensemble(clubsFiltres(p, f)), tot = {};
      p.profil.forEach(function (r) { if (ids[r.club] && r.dimension === dimension) tot[r.valeur] = (tot[r.valeur] || 0) + n(r.n); });
      var total = 0; p.profil.forEach(function (r) { if (ids[r.club] && r.dimension === "handicap") total += n(r.n); });
      return Object.keys(tot).sort(function (a, b) { return dimension === "age" ? a - b : String(a).localeCompare(String(b)); })
        .map(function (v) { return { cle: v, label: dimension === "age" ? v + " ans" : lib(dimension, v), n: tot[v], pct: pct(tot[v], total) }; });
    },

    criteres: function (tdb, f) {
      var p = preparer(tdb); if (!p.mois.length) return [];
      var cs = clubsFiltres(p, f), m = moisChoisi(p, f), rs = lignes(p, ensemble(cs), m), obs = somme(rs, "obs");
      return Object.keys(LIB.critere).map(function (c) { return { cle: c, label: lib("critere", c), score_pct: pct(somme(rs, c), obs * 2) }; });
    },

    superviseures: function (tdb, f) {
      var p = preparer(tdb); if (!p.mois.length) return [];
      var cs = clubsFiltres(p, f), m = moisChoisi(p, f), ops = opsAu(cs, m), rs = lignes(p, ensemble(cs), m), parClubLigne = {}, g = {};
      rs.forEach(function (r) { parClubLigne[r.club] = r; });
      ops.forEach(function (c) { (g[c.superviseure || "Non attribuée"] = g[c.superviseure || "Non attribuée"] || []).push(c); });
      return Object.keys(g).sort().map(function (s) {
        var rg = g[s].map(function (c) { return parClubLigne[c.club]; }).filter(Boolean);
        return { superviseure: s, clubs: g[s].length, visites: rg.filter(function (r) { return n(r.supervise) === 1; }).length,
          sup_pct: pct(rg.filter(function (r) { return n(r.supervise) === 1; }).length, g[s].length),
          qual_moy: moy(rg.map(function (r) { return r.score_qualite_pct == null ? null : n(r.score_qualite_pct); })),
          actions: somme(rg, "actions_nouvelles"), cloture_pct: pct(somme(rg, "actions_closes"), somme(rg, "actions_precedentes")) };
      });
    },

    formation: function (tdb, f) {
      var p = preparer(tdb), g = {};
      p.formation.forEach(function (r) {
        if (f && f.province && r.province && r.province !== f.province) return;
        var o = g[r.niveau] = g[r.niveau] || { niveau: r.niveau, label: lib("niveau", r.niveau), n_pre: 0, s_pre: 0, n_post: 0, s_post: 0, certifies: 0, femmes: 0, hommes: 0, jp: 0, jprev: 0 };
        if (r.type_test === "pre") { o.n_pre += n(r.n); o.s_pre += n(r.score_total); }
        if (r.type_test === "post") { o.n_post += n(r.n); o.s_post += n(r.score_total); o.certifies += n(r.certifies); o.jp += n(r.jours_presence); o.jprev += n(r.jours_prevus);
          if (r.sexe === "F") o.femmes += n(r.n); else if (r.sexe === "M") o.hommes += n(r.n); }
      });
      return ["central", "provincial", "animatrice"].filter(function (k) { return g[k]; }).map(function (k) {
        var o = g[k], pre = o.n_pre ? Math.round(o.s_pre / o.n_pre * 10) / 10 : null, post = o.n_post ? Math.round(o.s_post / o.n_post * 10) / 10 : null;
        return { niveau: k, label: o.label, formes: o.n_post, femmes: o.femmes, hommes: o.hommes, moy_pre: pre, moy_post: post,
          gain: pre != null && post != null ? Math.round((post - pre) * 10) / 10 : null, certifies: o.certifies, cible: CIBLES_FORMATION[k],
          presence_pct: pct(o.jp, o.jprev) };
      });
    },

    enquete: function (tdb, f) {
      var p = preparer(tdb), g = {};
      p.enquete.forEach(function (r) {
        if (f && f.province && r.province !== f.province) return;
        if (f && f.tranche && r.tranche !== f.tranche) return;
        var o = g[r.vague] = g[r.vague] || { vague: r.vague, n: 0, conn: 0, M1: 0, M2: 0, M3: 0, M4: 0, M5: 0, autoeff: 0, services: 0, allo: 0, membres: 0, espace: 0 };
        o.n += n(r.n); o.conn += n(r.conn_total); o.autoeff += n(r.autoeff_total); o.services += n(r.services_n); o.allo += n(r.allo_n);
        o.membres += n(r.membres_n); o.espace += n(r.espace_ok_n);
        ["M1", "M2", "M3", "M4", "M5"].forEach(function (mm) { o[mm] += n(r["conn_" + mm]); });
      });
      var noms = { Baseline: "Situation de référence", "Mi-parcours": "Mi-parcours", Final: "Évaluation finale" };
      return ["Baseline", "Mi-parcours", "Final"].filter(function (v) { return g[v]; }).map(function (v) {
        var o = g[v], d = function (x) { return o.n ? Math.round(x / o.n * 10) / 10 : null; };
        return { vague: v, label: noms[v], n: o.n, conn_pct: d(o.conn), M1: d(o.M1), M2: d(o.M2), M3: d(o.M3), M4: d(o.M4), M5: d(o.M5),
          autoeff: d(o.autoeff), services_pct: pct(o.services, o.n), allo_pct: pct(o.allo, o.n), espace_pct: pct(o.espace, o.membres) };
      });
    }
  };
  global.PAAF = M;
})(typeof window !== "undefined" ? window : globalThis);
