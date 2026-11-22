/* Dessins du tableau de bord « PAAF Clubs Filles » (graphiques, carte, tableaux), avec d3.
   Chaque fonction remplit l'élément qu'on lui donne ; utilisé par la page en ligne et par l'application. */
(function (global) {
  "use strict";
  var fr = d3.formatLocale({ decimal: ",", thousands: " ", grouping: [3], currency: ["", ""] });
  var R = { fint: fr.format(",d"), fdec: fr.format(",.1f") };
  R.pc = function (v) { return v == null ? "—" : R.fdec(v) + " %"; };
  R.nb = function (v) { return v == null ? "—" : R.fint(v); };

  function largeur(el) { return Math.max(260, el.clientWidth || 600); }
  function tip(el) {
    var t = el.querySelector(".paaf-tip");
    if (!t) { t = document.createElement("div"); t.className = "paaf-tip"; t.hidden = true; el.appendChild(t); }
    return t;
  }
  function placer(t, el, ev) {
    var b = el.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top;
    t.style.left = Math.max(0, Math.min(x + 10, el.clientWidth - t.offsetWidth - 4)) + "px";
    t.style.top = Math.max(0, y - 34) + "px";
  }
  function lignesTip(t, titre, lignes) {
    t.replaceChildren();
    var h = document.createElement("div"); h.style.fontWeight = "600"; h.textContent = titre; t.appendChild(h);
    lignes.forEach(function (l) { var d = document.createElement("div"); d.textContent = l; t.appendChild(d); });
  }
  R.vide = function (el, msg) { el.replaceChildren(); var p = document.createElement("p"); p.className = "paaf-vide"; p.textContent = msg || "Pas encore de données."; el.appendChild(p); };

  /* Barres horizontales : rows [{label, valeur, detail?}] ; opts {max, fmt, couleur, aria} */
  R.barresH = function (el, rows, o) {
    o = o || {}; el.replaceChildren();
    rows = rows.filter(function (r) { return r.valeur != null; });
    if (!rows.length) return R.vide(el);
    var W = largeur(el), hb = 24, gap = 8, H = rows.length * (hb + gap) + 6;
    var svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", "0 0 " + W + " " + H).attr("role", "img").attr("aria-label", o.aria || "Graphique en barres");
    var probe = svg.append("text").attr("class", "paaf-lab"), lmax = 0;
    rows.forEach(function (r) { probe.text(r.label); lmax = Math.max(lmax, probe.node().getComputedTextLength()); }); probe.remove();
    var ml = Math.min(W * 0.48, lmax + 10), mr = 56;
    function couper(t) { var tx = d3.select(this), mot = tx.text(); while (mot.length > 3 && this.getComputedTextLength() > ml - 12) { mot = mot.slice(0, -2); tx.text(mot + "…"); } }
    var x = d3.scaleLinear().domain([0, o.max || d3.max(rows, function (r) { return r.valeur; }) || 1]).range([0, W - ml - mr]);
    var g = svg.selectAll("g.l").data(rows).join("g").attr("class", "l").attr("transform", function (r, i) { return "translate(0," + (i * (hb + gap) + 3) + ")"; });
    g.append("text").attr("class", "paaf-lab").attr("x", ml - 8).attr("y", hb / 2 + 4).attr("text-anchor", "end").text(function (r) { return r.label; }).each(couper);
    g.append("rect").attr("x", ml).attr("width", W - ml - mr).attr("height", hb).attr("rx", 3).style("fill", "var(--paaf-fond-barre)");
    g.append("rect").attr("x", ml).attr("width", function (r) { return Math.max(0, x(Math.min(r.valeur, o.max || r.valeur))); }).attr("height", hb).attr("rx", 3)
      .style("fill", function (r) { return r.couleur || o.couleur; });
    g.append("text").attr("class", "paaf-val").attr("x", function (r) { return ml + Math.max(0, x(Math.min(r.valeur, o.max || r.valeur))) + 6; }).attr("y", hb / 2 + 4)
      .text(function (r) { return (o.fmt || R.fdec)(r.valeur); });
    if (o.detail) {
      var t = tip(el);
      g.on("pointerenter pointermove", function (ev, r) { t.hidden = false; lignesTip(t, r.label, o.detail(r)); placer(t, el, ev); })
       .on("pointerleave", function () { t.hidden = true; });
    }
  };

  /* Courbes mensuelles : rows [{mois, mois_court, ...}] ; series [{k, label, couleur}] */
  R.courbes = function (el, rows, series, o) {
    o = o || {}; el.replaceChildren();
    if (!rows.length) return R.vide(el);
    var W = largeur(el), H = 240, ml = 44, mr = 40, mb = 26;
    var svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", "0 0 " + W + " " + H).attr("role", "img").attr("aria-label", o.aria || "Évolution mensuelle");
    var y = d3.scaleLinear().domain(o.domaine || [0, 100]).range([H - mb, 10]);
    var x = d3.scalePoint().domain(rows.map(function (r) { return r.mois; })).range([ml + 12, W - mr]).padding(rows.length === 1 ? 0.5 : 0);
    svg.append("g").attr("class", "paaf-axe").attr("transform", "translate(" + ml + ",0)")
      .call(d3.axisLeft(y).ticks(5).tickSize(-(W - ml - mr + 12)).tickFormat(function (v) { return v + (o.suffixe == null ? " %" : o.suffixe); }))
      .call(function (g) { g.select(".domain").remove(); });
    var lx = rows.length > 8 ? rows.filter(function (r, i) { return i % Math.ceil(rows.length / 8) === 0; }).map(function (r) { return r.mois; }) : null;
    svg.append("g").attr("class", "paaf-axe").attr("transform", "translate(0," + (H - mb) + ")")
      .call(d3.axisBottom(x).tickValues(lx).tickFormat(function (m) { var r = rows.find(function (q) { return q.mois === m; }); return r ? r.mois_court : m; }).tickSize(0).tickPadding(9));
    series.forEach(function (s) {
      var pts = rows.filter(function (r) { return r[s.k] != null; });
      svg.append("path").datum(pts).attr("fill", "none").style("stroke", s.couleur).attr("stroke-width", 2.2)
        .attr("d", d3.line().x(function (r) { return x(r.mois); }).y(function (r) { return y(r[s.k]); }));
      svg.append("g").selectAll("circle").data(pts).join("circle").attr("r", 3.5).attr("cx", function (r) { return x(r.mois); }).attr("cy", function (r) { return y(r[s.k]); }).style("fill", s.couleur);
      var der = pts[pts.length - 1];
      if (der) svg.append("text").attr("class", "paaf-val").attr("x", x(der.mois) + 6).attr("y", y(der[s.k]) + 4).text(R.fdec(der[s.k]));
    });
    var t = tip(el), pas = rows.length > 1 ? x.step() : W;
    svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", function (r) { return x(r.mois) - pas / 2; }).attr("width", pas).attr("y", 0).attr("height", H - mb).style("fill", "transparent")
      .on("pointerenter pointermove", function (ev, r) {
        t.hidden = false;
        lignesTip(t, PAAF.moisLabel(r.mois), series.map(function (s) { return s.label + " : " + (r[s.k] == null ? "—" : R.fdec(r[s.k]) + (o.suffixe == null ? " %" : o.suffixe)); }));
        placer(t, el, ev);
      }).on("pointerleave", function () { t.hidden = true; });
  };

  /* Barres groupées : categories [{k, label}], rows = séries [{label, couleur, ...valeurs par k}] */
  R.barresGroupees = function (el, categories, rows, o) {
    o = o || {}; el.replaceChildren();
    if (!rows.length) return R.vide(el);
    var W = largeur(el), H = 260, ml = 40, mb = 44;
    var svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", "0 0 " + W + " " + H).attr("role", "img").attr("aria-label", o.aria || "Comparaison");
    var y = d3.scaleLinear().domain([0, o.max || 100]).range([H - mb, 12]);
    var x0 = d3.scaleBand().domain(categories.map(function (c) { return c.k; })).range([ml, W - 6]).paddingInner(0.22).paddingOuter(0.06);
    var x1 = d3.scaleBand().domain(rows.map(function (r, i) { return i; })).range([0, x0.bandwidth()]).padding(0.08);
    svg.append("g").attr("class", "paaf-axe").attr("transform", "translate(" + ml + ",0)")
      .call(d3.axisLeft(y).ticks(5).tickSize(-(W - ml - 6)).tickFormat(function (v) { return v + (o.suffixe == null ? " %" : o.suffixe); }))
      .call(function (g) { g.select(".domain").remove(); });
    var xa = svg.append("g").attr("class", "paaf-axe").attr("transform", "translate(0," + (H - mb) + ")").call(d3.axisBottom(x0).tickSize(0).tickPadding(10).tickFormat(function (k) { return (categories.find(function (c) { return c.k === k; }) || {}).label; }));
    xa.selectAll(".tick text").each(function () { var tx = d3.select(this), mots = tx.text().split(" "); if (x0.bandwidth() < 90 && mots.length > 1) { tx.text(null); var mi = Math.ceil(mots.length / 2); [mots.slice(0, mi).join(" "), mots.slice(mi).join(" ")].forEach(function (s, i) { tx.append("tspan").attr("x", 0).attr("dy", i ? "1.1em" : 0).text(s); }); } });
    var t = tip(el), data = [];
    categories.forEach(function (c) { rows.forEach(function (r, i) { if (r[c.k] != null) data.push({ c: c, r: r, i: i, v: r[c.k] }); }); });
    svg.append("g").selectAll("rect").data(data).join("rect").attr("x", function (d) { return x0(d.c.k) + x1(d.i); }).attr("width", x1.bandwidth())
      .attr("y", function (d) { return y(d.v); }).attr("height", function (d) { return y(0) - y(d.v); }).attr("rx", 2).style("fill", function (d) { return d.r.couleur; })
      .on("pointerenter pointermove", function (ev, d) { t.hidden = false; lignesTip(t, d.c.label, [d.r.label + " : " + R.fdec(d.v) + (o.suffixe == null ? " %" : o.suffixe)]); placer(t, el, ev); })
      .on("pointerleave", function () { t.hidden = true; });
    if (x1.bandwidth() >= 20) svg.append("g").selectAll("text").data(data).join("text").attr("class", "paaf-val").attr("text-anchor", "middle")
      .attr("x", function (d) { return x0(d.c.k) + x1(d.i) + x1.bandwidth() / 2; }).attr("y", function (d) { return y(d.v) - 4; }).text(function (d) { return Math.round(d.v); });
  };

  /* Carte des écoles : rows = PAAF.ecoles(...) ; o.couleurs {deux, un, aucun, alerte} ; o.choisir(ecole) */
  var REPERES = [{ nom: "Tshikapa", lat: -6.42, lon: 20.80 }, { nom: "Ilebo", lat: -4.33, lon: 20.58 }, { nom: "Luebo", lat: -5.35, lon: 21.42 },
                 { nom: "Mweka", lat: -4.85, lon: 21.57 }, { nom: "Kananga", lat: -5.90, lon: 22.42 }];
  R.ETATS = { deux: "2 clubs actifs", un: "1 club actif", aucun: "Aucun club actif", alerte: "En alerte" };
  R.carte = function (el, rows, o) {
    o = o || {}; el.replaceChildren();
    var pts = rows.filter(function (r) { return r.lat != null && r.lon != null; });
    if (!pts.length) return R.vide(el, "Aucune école avec coordonnées GPS (fiche F1).");
    var W = largeur(el), H = Math.round(Math.min(520, Math.max(300, W * 0.75))), m = 26;
    var la = d3.extent(pts, function (r) { return r.lat; }), lo = d3.extent(pts, function (r) { return r.lon; });
    var dl = Math.max(0.2, (la[1] - la[0]) * 0.12), dn = Math.max(0.2, (lo[1] - lo[0]) * 0.12);
    var feat = { type: "MultiPoint", coordinates: [[lo[0] - dn, la[0] - dl], [lo[1] + dn, la[1] + dl]] };
    var proj = d3.geoMercator().fitExtent([[m, m], [W - m, H - m]], feat);
    var svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", "0 0 " + W + " " + H).attr("role", "img")
      .attr("aria-label", "Carte des " + pts.length + " écoles avec clubs des filles");
    svg.append("rect").attr("width", W).attr("height", H).attr("rx", 8).style("fill", "var(--paaf-fond-carte)");
    var pas = (lo[1] - lo[0] + la[1] - la[0]) > 4 ? 1 : 0.5;
    svg.append("path").datum(d3.geoGraticule().step([pas, pas])()).attr("d", d3.geoPath(proj)).attr("fill", "none").style("stroke", "var(--paaf-grille)");
    var b = proj.invert([0, 0]), e = proj.invert([W, H]);
    REPERES.filter(function (r) { return r.lon >= b[0] && r.lon <= e[0] && r.lat <= b[1] && r.lat >= e[1]; }).forEach(function (r) {
      var p = proj([r.lon, r.lat]);
      svg.append("rect").attr("x", p[0] - 3).attr("y", p[1] - 3).attr("width", 6).attr("height", 6).style("fill", "var(--paaf-texte-doux)");
      svg.append("text").attr("class", "paaf-repere").attr("x", p[0] + 7).attr("y", p[1] + 4).text(r.nom);
    });
    var t = tip(el), ordre = { aucun: 0, un: 1, deux: 2, alerte: 3 };
    svg.append("g").selectAll("circle").data(pts.slice().sort(function (a, b2) { return ordre[a.etat] - ordre[b2.etat]; })).join("circle")
      .attr("cx", function (r) { return proj([r.lon, r.lat])[0]; }).attr("cy", function (r) { return proj([r.lon, r.lat])[1]; })
      .attr("r", W < 500 ? 5.5 : 6.5).style("fill", function (r) { return (o.couleurs || {})[r.etat]; }).style("stroke", "var(--paaf-fond)").attr("stroke-width", 1.2)
      .style("cursor", "pointer")
      .on("pointerenter pointermove", function (ev, r) {
        t.hidden = false;
        lignesTip(t, "École " + r.ecole, [R.ETATS[r.etat], r.clubs_ops + " club(s) actif(s) sur " + r.clubs, R.nb(r.filles) + " filles inscrites", "Participation : " + R.pc(r.part_pct)]);
        placer(t, el, ev);
      }).on("pointerleave", function () { t.hidden = true; })
      .on("click", function (ev, r) { if (o.choisir) o.choisir(r); });
    var sans = rows.length - pts.length;
    if (sans > 0) svg.append("text").attr("class", "paaf-repere").attr("x", 10).attr("y", H - 8).text(sans + " école(s) sans coordonnées GPS");
  };

  /* Tableau : tbody, rows, cols [{k, fmt?, num?}] */
  R.table = function (tbody, rows, cols, cle) {
    tbody.replaceChildren();
    if (!rows.length) { var tr0 = document.createElement("tr"), td0 = document.createElement("td"); td0.colSpan = cols.length; td0.textContent = "Aucune donnée pour cette sélection."; tr0.appendChild(td0); tbody.appendChild(tr0); return; }
    rows.forEach(function (r) {
      var tr = document.createElement("tr"); if (cle) tr.dataset.key = String(r[cle]);
      cols.forEach(function (c) {
        var td = document.createElement("td"), v = r[c.k];
        td.textContent = v == null || v === "" ? "—" : c.fmt ? c.fmt(v, r) : String(v);
        if (c.num) td.className = "num";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  };

  /* Jauge de progrès vers une cible */
  R.jauge = function (el, valeur, cible) {
    el.replaceChildren();
    var fond = document.createElement("div"); fond.className = "paaf-jauge";
    var barre = document.createElement("div"); barre.className = "paaf-jauge-barre";
    barre.style.width = cible ? Math.min(100, (valeur || 0) / cible * 100) + "%" : "0";
    fond.appendChild(barre); el.appendChild(fond);
  };

  global.PAAF_RENDU = R;
})(typeof window !== "undefined" ? window : globalThis);
