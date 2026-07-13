import React, { useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';

/* =========================================================================
 * Tarkov Gun Mod Optimizer — shared core (non-UI logic + shared components)
 * แยกออกจาก WeaponOptimizer.jsx เพื่อให้ CaliberOptimizer.jsx ใช้ร่วมกันได้
 * ข้อมูล preprocess จาก tarkov.dev -> public/optimizer_data.json
 * ========================================================================= */

export const DATA_URL = `${import.meta.env.BASE_URL}optimizer_data.json`;

export const rub = (n) => (n == null ? '—' : '₽' + Math.round(n).toLocaleString());
export const isSuppressor = (m) => (m.types || []).includes('suppressor');

export const SUP_BONUS = 1e6; // routes greedy selection down a branch that can host a suppressor
export const INC_BONUS = 1e6; // same routing trick for user "must-include" mods

// Base objective weights {erg, rec}. Ergo points per mod (+5..+20) dwarf recoil
// percentages (-1..-7%), so no static weight pair yields a true middle build —
// "balanced" is instead computed in computeBuild by bracketing the two extremes
// and maxing ergo with recoil capped at their midpoint.
export const OBJ_W = {
  recoil: { erg: 0.4, rec: 3 },
  ergo: { erg: 3, rec: 0.4 },
};
export const OBJ_LABEL = { recoil: 'เน้นลด Recoil', ergo: 'เน้น Ergonomics', balanced: 'สมดุล' };

// Optic/sight/rail/light slots: no recoil effect, tiny ergo the optimizer would
// "farm" by stacking mounts. Skipped by default so builds stay realistic.
export const OPTIC_PREFIXES = ['mod_scope', 'mod_mount', 'mod_tactical', 'mod_sight', 'mod_flashlight', 'mod_nvg'];
export const isOpticSlot = (slot) => slot.nameId && OPTIC_PREFIXES.some((p) => slot.nameId.startsWith(p));

// --- Does this mod (or anything reachable through its slots) match a must-include id?
export function makeReaches(MODS) {
  const cache = new Map();
  const reaches = (id, inc) => {
    if (inc.has(id)) return true;
    if (cache.has(id)) return cache.get(id);
    cache.set(id, false); // cycle guard
    const m = MODS[id];
    let r = false;
    if (m) {
      for (const s of m.slots || []) {
        if (s.allowed.some((a) => reaches(a, inc))) {
          r = true;
          break;
        }
      }
    }
    cache.set(id, r);
    return r;
  };
  return reaches;
}

// tarkov.dev's conflictingItems is often one-directional: a grip/stock combo like
// the Hera Arms CQR lists the stocks it blocks, but those stocks don't list the CQR
// back. Check BOTH directions so we never stack two mutually-exclusive mods.
// Register / unregister every mod id in a committed pick-tree. optimizeSlots must
// undo the ids a rejected candidate's sub-evaluation committed, or mods from builds
// we didn't keep leak into conflict checks and the must-include status.
export function addPickIds(picks, ids) {
  for (const p of picks) {
    ids.add(p.mod.id);
    if (p.children.length) addPickIds(p.children, ids);
  }
}
export function removePickIds(picks, ids) {
  for (const p of picks) {
    ids.delete(p.mod.id);
    if (p.children.length) removePickIds(p.children, ids);
  }
}

export function hasConflict(m, chosenIds, MODS) {
  if (m.conflicts && m.conflicts.some((c) => chosenIds.has(c))) return true;
  for (const cid of chosenIds) {
    const cm = MODS[cid];
    if (cm && cm.conflicts && cm.conflicts.includes(m.id)) return true;
  }
  return false;
}

export function modScore(m, C, W) {
  const rec = -(m.recoil || 0); // positive = reduces recoil = good
  const erg = m.ergo || 0; // positive = better ergo
  let s = W.erg * erg + W.rec * rec;
  // Constraint routing: reward paths that lead to a suppressor / a must-include mod.
  if (C.needSup && isSuppressor(m)) s += SUP_BONUS;
  if (C.include.has(m.id)) s += INC_BONUS;
  return s;
}

// Recursively evaluate best pick for a slot's allowed items.
export function optimizeSlots(slots, budgetRef, C, chosenIds, MODS, W, reaches) {
  const picks = [];
  let score = 0,
    ergo = 0,
    recoilPct = 0,
    weight = 0,
    cost = 0,
    cap = 0,
    hasSup = false;
  for (const slot of slots) {
    // Skip optic/sight/rail/light slots (unless a must-include mod lives down this branch)
    if (
      C.skipOptics &&
      isOpticSlot(slot) &&
      !(C.include.size && slot.allowed.some((a) => reaches(a, C.include)))
    )
      continue;
    const isMagSlot = slot.nameId === 'mod_magazine';
    // a capacity constraint means the user wants a magazine — force-fill this slot
    const mustFill = slot.required || (isMagSlot && C.minCap > 0);
    let best = null;
    for (const id of slot.allowed) {
      const m = MODS[id];
      if (!m) continue;
      if (C.exclude.has(id)) continue; // user-banned mod
      if (C.onlyBuy && m.price == null) continue;
      if (hasConflict(m, chosenIds, MODS)) continue;
      if (isMagSlot && C.minCap > 0 && (m.capacity == null || m.capacity < C.minCap)) continue;
      const price = m.price || 0;
      if (budgetRef.left != null && price > budgetRef.left) continue;
      // evaluate this mod plus its own sub-slots greedily
      chosenIds.add(id);
      const subBudget = { left: budgetRef.left == null ? null : budgetRef.left - price };
      const sub = m.slots && m.slots.length ? optimizeSlots(m.slots, subBudget, C, chosenIds, MODS, W, reaches) : null;
      const totScore = modScore(m, C, W) + (sub ? sub.score : 0);
      const totCost = price + (sub ? sub.cost : 0);
      chosenIds.delete(id);
      if (sub) removePickIds(sub.picks, chosenIds); // undo the sub-evaluation's committed ids
      if (budgetRef.left != null && totCost > budgetRef.left) continue;
      if (!best || totScore > best.totScore || (totScore === best.totScore && totCost < best.totCost)) {
        best = { m, sub, totScore, totCost, price };
      }
    }
    // Must-fill slot with no positive-value option: pick the cheapest valid mod
    if (!best && mustFill) {
      for (const id of slot.allowed) {
        const m = MODS[id];
        if (!m) continue;
        if (C.exclude.has(id)) continue;
        if (C.onlyBuy && m.price == null) continue;
        if (hasConflict(m, chosenIds, MODS)) continue;
        if (isMagSlot && C.minCap > 0 && (m.capacity == null || m.capacity < C.minCap)) continue;
        const price = m.price || 0;
        if (budgetRef.left != null && price > budgetRef.left) continue;
        if (!best || price < best.price) best = { m, sub: null, totScore: modScore(m, C, W), totCost: price, price };
      }
    }
    if (best && best.totScore <= 0 && !mustFill) continue; // skip useless optional slots
    if (!best) continue;
    chosenIds.add(best.m.id);
    if (best.sub) addPickIds(best.sub.picks, chosenIds); // re-register the winning sub-tree
    picks.push({ slot: slot.name, mod: best.m, children: best.sub ? best.sub.picks : [] });
    score += best.totScore;
    cost += best.totCost;
    ergo += best.m.ergo || 0;
    recoilPct += best.m.recoil || 0;
    weight += best.m.weight || 0;
    if (best.m.capacity) cap = Math.max(cap, best.m.capacity);
    if (isSuppressor(best.m)) hasSup = true;
    if (best.sub) {
      ergo += best.sub.ergo;
      recoilPct += best.sub.recoilPct;
      weight += best.sub.weight;
      cap = Math.max(cap, best.sub.cap);
      hasSup = hasSup || best.sub.hasSup;
    }
    if (budgetRef.left != null) budgetRef.left -= best.totCost;
  }
  return { picks, score, cost, ergo, recoilPct, weight, cap, hasSup };
}

// --- Core optimization: returns the build + chosen ids + constraint messages ---
export function computeBuild(gun, C, objective, MODS) {
  const reaches = makeReaches(MODS);
  const recVof = (r) => Math.round(gun.recoilV * (1 + r.recoilPct / 100));
  const budget = () => ({ left: C.budget > 0 ? C.budget : null });
  const pass = (W) => {
    const c = new Set();
    const r = optimizeSlots(gun.slots, budget(), C, c, MODS, W, reaches);
    return { r, c };
  };

  // Maximum ergo with recoil ≤ cap. Lighter recoil-weight = more ergo but higher
  // recoil; heavier = lower recoil but less ergo. So we want the LIGHTEST weight
  // that still meets the cap. Sweep light→heavy to bracket that boundary…
  const capSearch = (cap) => {
    const erg = OBJ_W.ergo.erg;
    const weights = [OBJ_W.ergo.rec, 1, 2, 3, 5, 8, 13, 21, 34, 55, 100, 200];
    let best = null, // best passing build so far (max ergo under cap)
      loFail = null, // last failing weight (just lighter than the bracket)
      hiPass = null, // first passing weight
      fb = null,
      fbRec = Infinity; // fallback if nothing meets the cap: lowest recoil we saw
    for (const w of weights) {
      const p = pass({ erg, rec: w });
      const rv = recVof(p.r);
      if (rv <= cap) {
        best = p;
        hiPass = w;
        break; // heavier weights only lower ergo — no need to look further
      }
      loFail = w;
      if (rv < fbRec) {
        fbRec = rv;
        fb = p;
      }
    }
    // …then binary-search between the last failing weight (higher ergo, over cap) and
    // the first passing weight to slide recoil as close to the cap as possible from
    // below — recovering the ergo that the coarse step would otherwise overshoot.
    if (best && loFail != null && hiPass != null) {
      let lo = loFail,
        hi = hiPass;
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        const p = pass({ erg, rec: mid });
        if (recVof(p.r) <= cap) {
          if (p.r.ergo > best.r.ergo) best = p; // keep the higher-ergo passing build
          hi = mid; // try to lighten further (push recoil up toward the cap)
        } else {
          lo = mid;
        }
      }
    }
    return best || fb;
  };

  let out;
  if (C.maxRecoil > 0 && objective !== 'recoil') {
    out = capSearch(C.maxRecoil);
  } else if (objective === 'balanced') {
    // สมดุล: sweep the ergo↔recoil tradeoff curve, normalize both stats onto the
    // achievable range, and keep the build whose WORSE normalized stat is best
    // (maximin) — a genuinely middle build even when the curve has big gaps.
    const cands = [pass(OBJ_W.ergo), pass(OBJ_W.recoil)]; // the two extremes anchor the range
    for (let w = 1; w <= 200; w *= 1.25) cands.push(pass({ erg: OBJ_W.ergo.erg, rec: w }));
    const ergs = cands.map((p) => p.r.ergo);
    const recs = cands.map((p) => recVof(p.r));
    const eLo = Math.min(...ergs),
      eHi = Math.max(...ergs);
    const rLo = Math.min(...recs),
      rHi = Math.max(...recs);
    let bestKey = -Infinity;
    for (let i = 0; i < cands.length; i++) {
      const eN = eHi > eLo ? (ergs[i] - eLo) / (eHi - eLo) : 1;
      const rN = rHi > rLo ? (rHi - recs[i]) / (rHi - rLo) : 1;
      const key = Math.min(eN, rN) + 0.001 * (eN + rN); // maximin, tie-break by sum
      if (key > bestKey) {
        bestKey = key;
        out = cands[i];
      }
    }
  } else {
    out = pass(OBJ_W[objective]);
  }
  const res = out.r,
    chosen = out.c;

  const baseErgo = gun.ergo,
    baseRecV = gun.recoilV,
    baseRecH = gun.recoilH;
  const finalErgo = Math.round(baseErgo + res.ergo);
  const recFactor = 1 + res.recoilPct / 100;
  const finalRecV = Math.round(baseRecV * recFactor);
  const finalRecH = Math.round(baseRecH * recFactor);
  const totalCost = (gun.price || 0) + res.cost;

  // constraint status banner
  const msgs = [];
  for (const id of C.include) {
    const m = MODS[id];
    const nm = m ? m.shortName || m.name : id;
    msgs.push(
      chosen.has(id)
        ? { ok: 1, t: `✓ ใส่ "${nm}" แล้ว` }
        : { ok: 0, t: `✗ ใส่ "${nm}" ไม่ได้ (ไม่เข้ากับปืนนี้ หรือชนกับชิ้นอื่น)` }
    );
  }
  if (C.needSup)
    msgs.push(
      res.hasSup
        ? { ok: 1, t: '✓ ติดตั้ง Suppressor แล้ว' }
        : { ok: 0, t: '✗ ปืนนี้ติด Suppressor ไม่ได้ (ไม่พบช่องที่รองรับ)' }
    );
  if (C.minCap > 0)
    msgs.push(
      res.cap >= C.minCap
        ? { ok: 1, t: `✓ ความจุแม็ก ${res.cap} นัด (≥ ${C.minCap})` }
        : { ok: 0, t: `✗ ไม่มีแม็ก ≥ ${C.minCap} นัด (สูงสุดที่ได้ ${res.cap || '—'})` }
    );
  if (C.maxRecoil > 0)
    msgs.push(
      finalRecV <= C.maxRecoil
        ? { ok: 1, t: `✓ Recoil แนวตั้ง ${finalRecV} (≤ ${C.maxRecoil})` }
        : { ok: 0, t: `✗ ลด Recoil ได้ต่ำสุดแค่ ${finalRecV} (เกิน ${C.maxRecoil})` }
    );

  return {
    gun,
    res,
    objective,
    baseErgo,
    baseRecV,
    baseRecH,
    finalErgo,
    finalRecV,
    finalRecH,
    totalCost,
    budgetUsed: C.budget > 0 ? C.budget : null,
    msgs,
  };
}

// --- Caliber optimizer: cheapest build that reaches a recoil threshold ---------
// Runs a pure-recoil pass ({erg:0, rec:1}) to find the minimum achievable vertical
// recoil for this gun, then binary-searches the mod budget for the cheapest build
// that still meets `threshold`. Returns an object with the same shape as
// computeBuild's return (so buildCardDoc / BuildRows / the UI can consume it
// directly) plus a `feasible` flag.
export function findCheapestBuild(gun, threshold, C, MODS) {
  const reaches = makeReaches(MODS);
  const recVof = (r) => Math.round(gun.recoilV * (1 + r.recoilPct / 100));
  const W = { erg: 0, rec: 1 }; // pure recoil — never spend on ergo-only mods
  // Run one pure-recoil pass with an explicit budget bound (null = unlimited).
  const pass = (budgetLeft) => {
    const c = new Set();
    const r = optimizeSlots(gun.slots, { left: budgetLeft }, C, c, MODS, W, reaches);
    return { r, c };
  };

  // Turn a pass into a computeBuild-shaped build object.
  const toBuild = (out) => {
    const res = out.r,
      chosen = out.c;
    const baseErgo = gun.ergo,
      baseRecV = gun.recoilV,
      baseRecH = gun.recoilH;
    const finalErgo = Math.round(baseErgo + res.ergo);
    const recFactor = 1 + res.recoilPct / 100;
    const finalRecV = Math.round(baseRecV * recFactor);
    const finalRecH = Math.round(baseRecH * recFactor);
    const totalCost = (gun.price || 0) + res.cost;

    const msgs = [];
    for (const id of C.include) {
      const m = MODS[id];
      const nm = m ? m.shortName || m.name : id;
      msgs.push(
        chosen.has(id)
          ? { ok: 1, t: `✓ ใส่ "${nm}" แล้ว` }
          : { ok: 0, t: `✗ ใส่ "${nm}" ไม่ได้ (ไม่เข้ากับปืนนี้ หรือชนกับชิ้นอื่น)` }
      );
    }
    if (C.needSup)
      msgs.push(
        res.hasSup
          ? { ok: 1, t: '✓ ติดตั้ง Suppressor แล้ว' }
          : { ok: 0, t: '✗ ปืนนี้ติด Suppressor ไม่ได้ (ไม่พบช่องที่รองรับ)' }
      );
    if (C.minCap > 0)
      msgs.push(
        res.cap >= C.minCap
          ? { ok: 1, t: `✓ ความจุแม็ก ${res.cap} นัด (≥ ${C.minCap})` }
          : { ok: 0, t: `✗ ไม่มีแม็ก ≥ ${C.minCap} นัด (สูงสุดที่ได้ ${res.cap || '—'})` }
      );
    msgs.push(
      finalRecV <= threshold
        ? { ok: 1, t: `✓ Recoil แนวตั้ง ${finalRecV} (≤ ${threshold})` }
        : { ok: 0, t: `✗ ลด Recoil ได้ต่ำสุดแค่ ${finalRecV} (เกิน ${threshold})` }
    );

    return {
      gun,
      res,
      objective: 'recoil',
      baseErgo,
      baseRecV,
      baseRecH,
      finalErgo,
      finalRecV,
      finalRecH,
      totalCost,
      budgetUsed: null,
      msgs,
    };
  };

  // A pass "passes" only when every hard constraint holds — recoil alone isn't
  // enough: a tight budget could silently drop a must-include mod, the
  // suppressor, or the required mag capacity while still meeting the recoil cap.
  const satisfies = (p) =>
    recVof(p.r) <= threshold &&
    (!C.needSup || p.r.hasSup) &&
    (!(C.minCap > 0) || p.r.cap >= C.minCap) &&
    [...C.include].every((id) => p.c.has(id));

  // 1. Feasibility: unlimited-budget pure-recoil pass = minimum achievable recoil.
  const hiOut = pass(null);
  const minRecV = recVof(hiOut.r);
  const hiCost = hiOut.r.cost;

  if (!satisfies(hiOut)) {
    return { feasible: false, minRecV, ...toBuild(hiOut) };
  }

  // 2. Binary-search the mod budget in [0, hiCost] for the cheapest passing build.
  let lo = 0,
    hi = hiCost,
    cheapest = hiOut,
    cheapestCost = hiCost;
  for (let i = 0; i < 14 && hi - lo > 1000; i++) {
    const mid = (lo + hi) / 2;
    const p = pass(mid);
    if (satisfies(p)) {
      // passes — record if this build's actual mod cost is the cheapest so far
      if (p.r.cost <= cheapestCost) {
        cheapest = p;
        cheapestCost = p.r.cost;
      }
      hi = mid; // try a tighter budget
    } else {
      lo = mid; // need more budget
    }
  }

  return { feasible: true, minRecV, ...toBuild(cheapest) };
}

// tarkov.dev assets don't send CORS headers, which taints the export canvas.
// Route icons through images.weserv.nl, which re-serves them with `Access-Control-
// Allow-Origin: *` (and converts webp→png) so html2canvas can read the pixels.
export const proxyIcon = (url) =>
  url ? `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&output=png` : '';

/* ------- shareable build-card: builds the standalone HTML document ------- */
export function buildCardDoc(B) {
  const gun = B.gun,
    res = B.res;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const money = (n) => (n == null ? '—' : '₽' + Math.round(n).toLocaleString());
  const recoilCut = Math.round(-res.recoilPct);

  const rows = (picks, depth) =>
    picks
      .map((p) => {
        const m = p.mod,
          chips = [];
        if (m.recoil) chips.push(`<span class="c ${m.recoil < 0 ? 'good' : 'bad'}">recoil ${m.recoil > 0 ? '+' : ''}${m.recoil}%</span>`);
        if (m.ergo) chips.push(`<span class="c ${m.ergo > 0 ? 'good' : 'bad'}">ergo ${m.ergo > 0 ? '+' : ''}${m.ergo}</span>`);
        return `<div class="mrow" style="margin-left:${depth * 22}px">
        ${depth ? '<span class="tree">↳</span>' : ''}
        <img crossorigin="anonymous" src="${esc(proxyIcon(m.icon))}" onerror="this.style.opacity=0">
        <div class="minfo">
          <div class="mtop"><span class="slot">${esc(p.slot || '')}</span><b>${esc(m.shortName || m.name)}</b></div>
          <div class="mname">${esc(m.name)}</div>
          <div class="chips">${chips.join('') || '<span class="c">—</span>'}</div>
        </div>
        <div class="price">${money(m.price)}</div>
      </div>${p.children && p.children.length ? rows(p.children, depth + 1) : ''}`;
      })
      .join('');

  const consChips = (B.msgs || []).map((m) => `<span class="tag ${m.ok ? 'ok' : 'no'}">${esc(m.t)}</span>`).join('');
  const dArrow = (fin, base, goodUp) => {
    const diff = fin - base;
    if (!diff) return '';
    const good = diff > 0 === goodUp;
    return `<span class="delta ${good ? 'g' : 'b'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}</span>`;
  };

  const doc = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(gun.shortName || gun.name)} Build — Tarkov Optimizer</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Tahoma,sans-serif;background:#0d0b07;color:#e8e2d0;
    background-image:radial-gradient(1200px 600px at 50% -10%,#2a2617 0%,#0d0b07 60%);padding:28px 14px;min-height:100vh}
  .card{max-width:1040px;margin:0 auto;background:#16140d;border:1px solid #3a3527;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.6)}
  .hero{display:flex;gap:24px;align-items:center;padding:32px 36px;background:linear-gradient(120deg,#26231a 0%,#1a1811 70%);border-bottom:1px solid #3a3527;position:relative}
  .hero::before{content:"";position:absolute;left:0;top:0;bottom:0;width:7px;background:linear-gradient(#c8a656,#9fb04b)}
  .gunimg{width:168px;height:108px;object-fit:contain;flex:none;background:#0d0b07;border-radius:14px;border:1px solid #3a3527}
  .htext{flex:1;min-width:0}
  .htext h1{font-size:32px;color:#f0e9d2;letter-spacing:.3px;line-height:1.2}
  .htext .sub{margin-top:10px;display:flex;gap:10px;flex-wrap:wrap}
  .pill{font-size:16px;padding:5px 14px;border-radius:20px;background:#0d0b07;border:1px solid #3a3527;color:#c8a656}
  .pill.olive{color:#9fb04b}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:1px;background:#3a3527}
  .stat{background:#16140d;padding:22px 24px}
  .stat .k{font-size:14px;color:#a29a80;text-transform:uppercase;letter-spacing:.6px}
  .stat .v{font-size:37px;font-weight:800;margin-top:6px;color:#f0e9d2}
  .stat .v small{font-size:19px;color:#a29a80;font-weight:600}
  .delta{font-size:18px;margin-left:8px;font-weight:700}
  .delta.g{color:#7bbf5a}.delta.b{color:#d1685a}
  .bars{padding:24px 36px;border-top:1px solid #3a3527;border-bottom:1px solid #3a3527;background:#13110b}
  .bar{margin:14px 0}
  .bar .lab{display:flex;justify-content:space-between;font-size:16px;color:#a29a80;margin-bottom:7px}
  .bar .lab b{color:#e8e2d0}
  .track{height:12px;border-radius:8px;background:#26231a;overflow:hidden}
  .fill{height:100%;border-radius:8px;background:linear-gradient(90deg,#9fb04b,#7bbf5a)}
  .fill.rec{background:linear-gradient(90deg,#c8a656,#d1685a)}
  .tags{display:flex;gap:10px;flex-wrap:wrap;padding:22px 36px 6px}
  .tag{font-size:16px;padding:7px 15px;border-radius:10px}
  .tag.ok{background:#1e2a17;border:1px solid #3c5a26;color:#7bbf5a}
  .tag.no{background:#2e1c17;border:1px solid #5a3326;color:#d1685a}
  .list{padding:22px 28px 12px}
  .list h2{font-size:17px;color:#c8a656;text-transform:uppercase;letter-spacing:1px;margin:8px 8px 16px}
  .mrow{display:flex;align-items:center;gap:16px;padding:12px 14px;border-radius:12px}
  .mrow img{width:62px;height:62px;object-fit:contain;flex:none;background:#0d0b07;border-radius:9px;border:1px solid #2a2617}
  .tree{color:#5a5442;font-size:22px;margin-right:-4px}
  .minfo{flex:1;min-width:0}
  .mtop{display:flex;align-items:center;gap:10px}
  .mtop .slot{font-size:14px;color:#8f876d;background:#0d0b07;border:1px solid #2a2617;border-radius:6px;padding:2px 9px;flex:none}
  .mtop b{font-size:18px;color:#f0e9d2}
  .mname{font-size:15px;color:#a29a80;margin:3px 0 5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .c{font-size:14px;padding:2px 10px;border-radius:12px;background:#26231a;color:#a29a80}
  .c.good{color:#7bbf5a}.c.bad{color:#d1685a}
  .price{font-size:17px;color:#c8a656;white-space:nowrap;flex:none;font-weight:600}
  .foot{padding:22px 36px;border-top:1px solid #3a3527;color:#8f876d;font-size:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;background:#13110b}
  .foot b{color:#c8a656}
  .hintbar{max-width:1040px;margin:0 auto 16px;text-align:center;font-size:16px;color:#a29a80;background:#1c1a13;border:1px solid #3a3527;border-radius:12px;padding:12px 18px}
  .hintbar b{color:#c8a656}
  @media print{.hintbar{display:none}}
</style></head>
<body>
  <div class="hintbar">📸 กด <b>Win + Shift + S</b> แล้วลากเลือกเฉพาะการ์ด เพื่อบันทึกเป็นรูป • ไม่ต้องเซฟหน้านี้</div>
  <div class="card">
  <div class="hero">
    <img class="gunimg" crossorigin="anonymous" src="${esc(proxyIcon(gun.image || gun.icon))}" onerror="this.style.opacity=0">
    <div class="htext">
      <h1>${esc(gun.name)}</h1>
      <div class="sub">
        <span class="pill">${esc(gun.shortName || '')}</span>
        <span class="pill olive">${esc(gun.caliber || '')}</span>
        <span class="pill">🎯 ${esc(OBJ_LABEL[B.objective] || B.objective)}</span>
      </div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="k">Ergonomics</div><div class="v">${B.finalErgo}${dArrow(B.finalErgo, B.baseErgo, true)}</div></div>
    <div class="stat"><div class="k">Recoil ↕ ตั้ง</div><div class="v">${B.finalRecV}${dArrow(B.finalRecV, B.baseRecV, false)}</div></div>
    <div class="stat"><div class="k">Recoil ↔ นอน</div><div class="v">${B.finalRecH}${dArrow(B.finalRecH, B.baseRecH, false)}</div></div>
    <div class="stat"><div class="k">ความจุแม็ก</div><div class="v">${res.cap || '—'}${res.cap ? ' <small>นัด</small>' : ''}</div></div>
    <div class="stat"><div class="k">ราคารวม</div><div class="v" style="font-size:20px">${money(B.totalCost)}</div></div>
  </div>
  <div class="bars">
    <div class="bar"><div class="lab"><span>ลด Recoil รวม</span><b>-${recoilCut}%</b></div>
      <div class="track"><div class="fill rec" style="width:${Math.min(100, Math.max(0, recoilCut))}%"></div></div></div>
    <div class="bar"><div class="lab"><span>Ergonomics</span><b>${B.baseErgo} → ${B.finalErgo}</b></div>
      <div class="track"><div class="fill" style="width:${Math.min(100, Math.max(0, B.finalErgo))}%"></div></div></div>
  </div>
  ${consChips ? `<div class="tags">${consChips}</div>` : ''}
  <div class="list">
    <h2>⚙ ชุดมอด (${res.picks.length} ช่องหลัก)</h2>
    ${rows(res.picks, 0) || '<div style="padding:20px;color:#8f876d;text-align:center">ไม่มีมอดในชุด</div>'}
  </div>
  <div class="foot">
    <span>🔫 สร้างด้วย <b>Tarkov Gun Mod Optimizer</b></span>
    <span>ข้อมูล: tarkov.dev</span>
  </div>
</div></body></html>`;

  return doc;
}

// Fallback: open the card in a new tab so the user can screenshot it manually.
export function openCardTab(B) {
  if (!B) return;
  const w = window.open('', '_blank');
  if (w) {
    w.document.open();
    w.document.write(buildCardDoc(B));
    w.document.close();
  } else {
    alert('เบราว์เซอร์บล็อกการเปิดแท็บใหม่ — อนุญาต pop-up ให้หน้านี้แล้วลองอีกครั้ง');
  }
}

// Render the card in an offscreen iframe (isolates its CSS from the app), then
// rasterise it to a PNG via html2canvas and trigger a download.
export async function exportCardImage(B) {
  if (!B) return;
  const gun = B.gun;
  const fileName = `${(gun.shortName || gun.name || 'build').replace(/[^\w.-]+/g, '_')}_build.png`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1100px;height:10px;border:0;';
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument;
    idoc.open();
    idoc.write(buildCardDoc(B));
    idoc.close();

    // wait for the iframe document to finish parsing
    await new Promise((res) => {
      if (idoc.readyState === 'complete') res();
      else iframe.addEventListener('load', res, { once: true });
    });

    // wait for every proxied icon to settle (loaded or errored) so none are blank
    await Promise.all(
      [...idoc.images].map((img) =>
        img.complete ? Promise.resolve() : new Promise((r) => (img.onload = img.onerror = r))
      )
    );

    const card = idoc.querySelector('.card');
    const canvas = await html2canvas(card, {
      useCORS: true,
      backgroundColor: '#0d0b07',
      scale: 3,
      windowWidth: 1100,
    });

    await new Promise((res, rej) =>
      canvas.toBlob((blob) => {
        if (!blob) return rej(new Error('toBlob returned null'));
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        res();
      }, 'image/png')
    );
  } catch (e) {
    // if anything still fails, fall back to the screenshot-in-a-tab flow
    console.error('exportCardImage failed, opening tab instead:', e);
    openCardTab(B);
  } finally {
    document.body.removeChild(iframe);
  }
}

/* --------------------------- mod picker (chips) --------------------------- */
export function ModPicker({ kind, MODLIST, MODS, selected, onAdd, onRemove }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return MODLIST.filter((m) => (m.name + ' ' + (m.shortName || '')).toLowerCase().includes(s)).slice(0, 30);
  }, [q, MODLIST]);

  return (
    <div className="gmo-picker" data-kind={kind}>
      <input
        type="text"
        placeholder="ค้นหาชื่อ mod..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && q.trim() && (
        <div className="gmo-dropdown open">
          {hits.length ? (
            hits.map((m) => (
              <div
                key={m.id}
                className="opt"
                onMouseDown={() => {
                  onAdd(m.id);
                  setQ('');
                  setOpen(false);
                }}
              >
                <img src={m.icon || ''} onError={(e) => (e.target.style.visibility = 'hidden')} alt="" />
                <span className="t">{(m.shortName || '') + ' — ' + m.name}</span>
              </div>
            ))
          ) : (
            <div className="none">ไม่พบ mod ที่ตรง</div>
          )}
        </div>
      )}
      <div className="gmo-chips">
        {[...selected].map((id) => {
          const m = MODS[id];
          if (!m) return null;
          return (
            <span className="chip2" key={id}>
              <span className="t">{m.shortName || m.name}</span>
              <span className="x" onClick={() => onRemove(id)}>
                ×
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------- recursive build rows -------------------------- */
export function BuildRows({ picks, depth = 0 }) {
  return picks.map((p, i) => {
    const m = p.mod;
    const mParts = [];
    if (m.recoil)
      mParts.push(
        <span key="r" className={m.recoil < 0 ? 'up' : 'down'}>
          recoil {m.recoil > 0 ? '+' : ''}
          {m.recoil}%
        </span>
      );
    if (m.ergo)
      mParts.push(
        <span key="e" className={m.ergo > 0 ? 'up' : 'down'}>
          ergo {m.ergo > 0 ? '+' : ''}
          {m.ergo}
        </span>
      );
    return (
      <React.Fragment key={`${m.id}-${depth}-${i}`}>
        <div className={`gmo-row ${depth ? 'indent' : ''}`}>
          <img src={m.icon || ''} onError={(e) => (e.target.style.visibility = 'hidden')} alt="" />
          <div className="slot">
            {depth ? '↳ ' : ''}
            {p.slot || ''}
          </div>
          <div className="nm">
            <b>{m.shortName || m.name}</b>
            {m.name !== m.shortName && <span className="badge2">{m.name}</span>}
            <div className="mods">{mParts.length ? mParts.reduce((a, b) => [a, ' · ', b]) : '—'}</div>
          </div>
          <div className="pr">{rub(m.price)}</div>
        </div>
        {p.children && p.children.length > 0 && <BuildRows picks={p.children} depth={depth + 1} />}
      </React.Fragment>
    );
  });
}

/* All styles scoped under .gmo so they don't collide with Bootstrap / other pages */
export const GMO_CSS = `
.gmo{--bg:#12100c;--panel:#1c1a13;--panel2:#26231a;--line:#3a3527;--txt:#e8e2d0;--dim:#a29a80;--acc:#c8a656;--acc2:#9fb04b;--good:#7bbf5a;--bad:#d1685a;
  background:var(--bg);color:var(--txt);font-family:"Segoe UI",Tahoma,sans-serif;font-size:14px;min-height:calc(100vh - 56px)}
.gmo *{box-sizing:border-box}
.gmo-header{padding:16px 22px;border-bottom:1px solid var(--line);background:var(--panel)}
.gmo-header h1{margin:0;font-size:19px;color:var(--acc);letter-spacing:.5px}
.gmo-header p{margin:4px 0 0;color:var(--dim);font-size:12px}
.gmo-wrap{display:grid;grid-template-columns:340px 1fr;gap:0;min-height:calc(100vh - 118px)}
@media(max-width:820px){.gmo-wrap{grid-template-columns:1fr}}
.gmo-side{background:var(--panel);border-right:1px solid var(--line);padding:18px}
.gmo-main{padding:18px 22px;overflow-x:auto}
.gmo label{display:block;font-size:12px;color:var(--dim);margin:14px 0 5px;text-transform:uppercase;letter-spacing:.5px}
.gmo label.inline{text-transform:none;letter-spacing:0;color:var(--txt);display:flex;align-items:center;gap:6px}
.gmo label.mt{margin-top:14px}
.gmo select,.gmo input[type=number],.gmo input[type=text]{width:100%;padding:9px 10px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);border-radius:6px;font-size:14px}
.gmo input[type=checkbox]{width:auto}
.gmo select:focus,.gmo input:focus{outline:none;border-color:var(--acc)}
.gmo-seg{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.gmo-seg button{flex:1;min-width:70px;padding:8px 6px;background:var(--panel2);border:1px solid var(--line);color:var(--dim);border-radius:6px;cursor:pointer;font-size:12px}
.gmo-seg button.on{background:var(--acc);color:#1a1710;border-color:var(--acc);font-weight:600}
.gmo-go{width:100%;margin-top:20px;padding:12px;background:var(--acc);color:#1a1710;border:none;border-radius:7px;font-size:15px;font-weight:700;cursor:pointer}
.gmo-go:hover:not(:disabled){filter:brightness(1.08)}
.gmo-go:disabled{opacity:.4;cursor:not-allowed}
.gmo-go2{width:100%;margin-top:10px;padding:11px;background:transparent;color:var(--acc);border:1px solid var(--acc);border-radius:7px;font-size:14px;font-weight:600;cursor:pointer}
.gmo-go2:hover:not(:disabled){background:var(--acc);color:#1a1710}
.gmo-go2:disabled{opacity:.4;cursor:not-allowed}
.gmo-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:18px}
.gmo-stats .stat{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px}
.gmo-stats .k{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px}
.gmo-stats .v{font-size:22px;font-weight:700;margin-top:3px}
.gmo .stat-d{font-size:12px;margin-top:2px}
.gmo .up{color:var(--good)}.gmo .down{color:var(--bad)}
.gmo-build{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.gmo-row{display:flex;align-items:center;gap:12px;padding:9px 14px;border-top:1px solid var(--line)}
.gmo-row:first-child{border-top:none}
.gmo-row.basegun{background:var(--panel2)}
.gmo-row.basegun img{width:96px;height:52px}
.gmo-gunlist{margin-top:6px;max-height:360px;overflow-y:auto;background:var(--panel2);border:1px solid var(--line);border-radius:7px}
.gmo-gunlist .gitem{display:flex;align-items:center;gap:10px;padding:7px 9px;cursor:pointer;border-top:1px solid var(--line)}
.gmo-gunlist .gitem:first-child{border-top:none}
.gmo-gunlist .gitem:hover{background:var(--panel)}
.gmo-gunlist .gitem.on{background:var(--acc)}
.gmo-gunlist .gitem.on b{color:#1a1710}
.gmo-gunlist .gitem.on .gi-sub{color:#3a3320}
.gmo-gunlist .gitem img{width:72px;height:40px;object-fit:contain;flex:none;background:#0d0b07;border-radius:5px;border:1px solid var(--line)}
.gmo-gunlist .gitem.on img{border-color:#1a1710}
.gmo-gunlist .gi-info{flex:1;min-width:0}
.gmo-gunlist .gi-info b{font-size:13px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gmo-gunlist .gi-sub{font-size:11px;color:var(--dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gmo-gunlist .none{padding:14px;color:var(--dim);font-size:12px;text-align:center}
.gmo-row img{width:42px;height:42px;object-fit:contain;background:#0d0b07;border-radius:5px;flex:none}
.gmo-row .slot{width:130px;color:var(--dim);font-size:12px;flex:none}
.gmo-row .slot.accent{color:var(--acc)}
.gmo-row .nm{flex:1;min-width:0}
.gmo-row .nm b{font-weight:600}
.gmo-row .mods{font-size:12px;color:var(--dim);margin-top:2px}
.gmo-row .pr{text-align:right;font-size:13px;white-space:nowrap;color:var(--acc)}
.gmo-row.indent{padding-left:26px}
.gmo .badge2{display:inline-block;font-size:11px;padding:1px 7px;border-radius:10px;background:var(--panel2);color:var(--dim);margin-left:6px}
.gmo-empty{color:var(--dim);padding:40px;text-align:center}
.gmo-cons{background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:8px 10px}
.gmo-cons .con{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--txt);padding:5px 0}
.gmo-cons .con span{flex:none}
.gmo-cons .con input[type=number]{width:90px;padding:5px 7px}
.gmo-hint{font-size:12px;color:var(--dim);line-height:1.5;margin-top:8px;background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:8px 10px}
.gmo-hint b{color:var(--acc)}
.gmo-picker{position:relative}
.gmo-dropdown{position:absolute;left:0;right:0;top:38px;z-index:10;background:var(--panel2);border:1px solid var(--acc);border-radius:6px;max-height:230px;overflow-y:auto;box-shadow:0 6px 18px rgba(0,0,0,.5)}
.gmo-dropdown .opt{display:flex;align-items:center;gap:8px;padding:6px 9px;cursor:pointer;font-size:12px;border-top:1px solid var(--line)}
.gmo-dropdown .opt:first-child{border-top:none}
.gmo-dropdown .opt:hover{background:var(--acc);color:#1a1710}
.gmo-dropdown .opt img{width:26px;height:26px;object-fit:contain;background:#0d0b07;border-radius:4px;flex:none}
.gmo-dropdown .opt .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gmo-dropdown .none{padding:9px;color:var(--dim);font-size:12px}
.gmo-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
.gmo-chips .chip2{display:inline-flex;align-items:center;gap:6px;background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:3px 6px 3px 10px;font-size:12px;max-width:100%}
.gmo-chips .chip2 .t{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gmo-chips .chip2 .x{cursor:pointer;background:var(--line);color:var(--txt);border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;flex:none}
.gmo-chips .chip2 .x:hover{background:var(--bad);color:#fff}
.gmo-picker[data-kind=include] .chip2{border-color:#3c5a26}
.gmo-picker[data-kind=exclude] .chip2{border-color:#5a3326}
.gmo-note{border-radius:7px;padding:9px 12px;margin-bottom:14px;font-size:13px}
.gmo-note.ok{background:#1e2a17;border:1px solid #3c5a26;color:var(--good)}
.gmo-note.warn{background:#2e1c17;border:1px solid #5a3326;color:var(--bad)}
.gmo-footer{color:var(--dim);font-size:11px;padding:14px 22px;border-top:1px solid var(--line);margin-top:14px}

/* ---- Caliber Optimizer: ranking table + progress ---- */
.gmo-progress{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin-bottom:18px}
.gmo-progress .plabel{font-size:13px;color:var(--txt);margin-bottom:8px}
.gmo-progress .ptrack{height:10px;border-radius:6px;background:var(--panel2);overflow:hidden;border:1px solid var(--line)}
.gmo-progress .pfill{height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:6px;transition:width .15s}
.gmo-rank{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.gmo-rank-head{display:flex;align-items:center;gap:12px;padding:8px 14px;border-bottom:1px solid var(--line);background:var(--panel2);font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px}
.gmo-grouphdr{padding:10px 14px;font-size:12px;color:var(--acc);text-transform:uppercase;letter-spacing:.5px;background:var(--panel2);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.gmo-grouphdr.dim{color:var(--dim)}
.gmo-grouphdr .sortby{color:var(--dim);text-transform:none;letter-spacing:0;display:inline-flex;align-items:center;gap:6px}
.gmo-grouphdr .sortby select{padding:4px 8px;background:var(--panel);border:1px solid var(--line);color:var(--txt);border-radius:6px;font-size:12px}
.gmo-rrow{display:flex;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid var(--line);cursor:pointer}
.gmo-rrow:hover{background:var(--panel2)}
.gmo-rrow.infeasible{opacity:.55}
.gmo-rrow .rnk{width:34px;flex:none;text-align:center;font-size:16px;font-weight:700;color:var(--acc)}
.gmo-rrow img{width:72px;height:40px;object-fit:contain;flex:none;background:#0d0b07;border-radius:5px;border:1px solid var(--line)}
.gmo-rrow .gn{flex:1;min-width:0}
.gmo-rrow .gn b{font-size:14px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gmo-rrow .gn .sub{font-size:11px;color:var(--dim);margin-top:2px}
.gmo-rrow .col{flex:none;text-align:right;font-size:13px}
.gmo-rrow .col .k{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.4px}
.gmo-rrow .col.recv{width:96px}
.gmo-rrow .col.ergo{width:66px}
.gmo-rrow .col.gp{width:96px;color:var(--dim)}
.gmo-rrow .col.mc{width:96px;color:var(--dim)}
.gmo-rrow .col.tc{width:110px;color:var(--acc);font-weight:700}
.gmo-rrow .recv .v.ok{color:var(--good)}
.gmo-rrow .recv .v.no{color:var(--bad)}
.gmo-badge{display:inline-block;font-size:11px;padding:1px 8px;border-radius:10px;background:#2e1c17;border:1px solid #5a3326;color:var(--bad);margin-top:3px}
.gmo-expand{background:var(--bg);border-top:1px solid var(--line);padding:14px}
.gmo-expand .exp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.gmo-expand .exp-actions button{padding:9px 14px;background:transparent;color:var(--acc);border:1px solid var(--acc);border-radius:7px;font-size:13px;font-weight:600;cursor:pointer}
.gmo-expand .exp-actions button:hover:not(:disabled){background:var(--acc);color:#1a1710}
.gmo-expand .exp-actions button:disabled{opacity:.4;cursor:not-allowed}
.gmo-expand .gmo-build{margin-top:4px}
@media(max-width:820px){
  .gmo-rank-head{display:none}
  .gmo-rrow{flex-wrap:wrap}
  .gmo-rrow .gn{flex:1 1 60%}
  .gmo-rrow .col{flex:1 1 auto;text-align:left}
}
`;
