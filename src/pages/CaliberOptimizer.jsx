import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DATA_URL,
  rub,
  findCheapestBuild,
  exportCardImage,
  openCardTab,
  stashBuildForEdit,
  BuildRows,
  ModPicker,
  GMO_CSS,
} from './optimizerCore.jsx';
import { getData } from '../data/gameStore';

/* =========================================================================
 * Caliber Optimizer
 * เลือก caliber → ระบบไล่คำนวณปืนทุกรุ่นใน caliber นั้น หาว่ารุ่นไหนโม recoil
 * ลงมาถึง threshold ได้ด้วยราคารวม (ปืน+มอด) ต่ำที่สุด แล้วจัดอันดับให้เห็น
 * ใช้ core logic ร่วมกับ WeaponOptimizer.jsx จาก ./optimizerCore.jsx
 * ========================================================================= */

export default function CaliberOptimizer() {
  const navigate = useNavigate();
  const [data, setData] = useState(null); // {guns, mods}
  const [loadErr, setLoadErr] = useState('');

  const [caliber, setCaliber] = useState('');
  const [threshold, setThreshold] = useState('62');
  const [needSup, setNeedSup] = useState(false);
  const [minCap, setMinCap] = useState('30');
  const [maxTotal, setMaxTotal] = useState(''); // งบเพดานราคารวม (filter after compute)
  const [include, setInclude] = useState(() => new Set()); // mod ต้องใส่
  const [exclude, setExclude] = useState(() => new Set()); // mod ห้ามใส่
  const [onlyBuy, setOnlyBuy] = useState(true); // เฉพาะมอดที่มีราคา
  const [sortBy, setSortBy] = useState('total'); // เรียงกลุ่มที่ผ่านเป้าหมาย

  const [results, setResults] = useState(null); // array of build objects (with feasible flag)
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, name: '' });
  const [expanded, setExpanded] = useState(null); // gun id
  const [exportingId, setExportingId] = useState(null);

  const runToken = useRef(0); // cancellation guard — bump to abort a running loop

  // load precomputed dataset once
  useEffect(() => {
    let alive = true;
    getData('optimizer', DATA_URL) // live จาก tarkov.dev ก่อน, fallback ไฟล์ public
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => alive && setLoadErr(String(e)));
    return () => {
      alive = false;
      runToken.current++; // abort any in-flight loop on unmount
    };
  }, []);

  const GUNS = data?.guns || [];
  const MODS = data?.mods || {};
  const MODLIST = useMemo(
    () => Object.values(MODS).sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name)),
    [data]
  );

  // calibers sorted by gun count desc
  const calibers = useMemo(() => {
    const counts = new Map();
    for (const g of GUNS) {
      const c = g.caliber || '?';
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [GUNS]);

  const canRun = caliber && threshold !== '' && parseFloat(threshold) > 0 && !running;

  const run = async () => {
    const th = parseFloat(threshold);
    if (!caliber || !(th > 0)) return;
    const guns = GUNS.filter((g) => (g.caliber || '?') === caliber);
    const token = ++runToken.current;

    setRunning(true);
    setResults(null);
    setExpanded(null);
    setProgress({ done: 0, total: guns.length, name: '' });

    const C = {
      onlyBuy,
      skipOptics: true,
      needSup,
      minCap: parseInt(minCap) || 0,
      maxRecoil: 0,
      budget: 0,
      include: new Set(include),
      exclude: new Set(exclude),
    };

    const out = [];
    for (let i = 0; i < guns.length; i++) {
      if (token !== runToken.current) return; // a newer run started — bail
      const gun = guns[i];
      setProgress({ done: i, total: guns.length, name: gun.shortName || gun.name });
      // yield to the UI so the progress bar can paint before this gun's search
      await new Promise((r) => setTimeout(r, 0));
      if (token !== runToken.current) return;
      const b = findCheapestBuild(gun, th, C, MODS);
      out.push(b);
    }
    if (token !== runToken.current) return;

    setProgress({ done: guns.length, total: guns.length, name: '' });
    setResults(out);
    setRunning(false);
  };

  // split + sort + apply the optional total-cost ceiling
  const SORTS = {
    total: { label: 'Cheapest total', cmp: (a, b) => a.totalCost - b.totalCost },
    mod: { label: 'Cheapest mods', cmp: (a, b) => a.res.cost - b.res.cost },
    recoil: { label: 'Lowest recoil', cmp: (a, b) => a.finalRecV - b.finalRecV },
    ergo: { label: 'Highest ergo', cmp: (a, b) => b.finalErgo - a.finalErgo },
    gun: { label: 'Cheapest gun', cmp: (a, b) => (a.gun.price || 0) - (b.gun.price || 0) },
  };
  const { feasible, infeasible } = useMemo(() => {
    if (!results) return { feasible: [], infeasible: [] };
    const cap = parseFloat(maxTotal) || 0;
    let feas = results.filter((b) => b.feasible);
    if (cap > 0) feas = feas.filter((b) => b.totalCost <= cap);
    feas = feas.slice().sort((SORTS[sortBy] || SORTS.total).cmp);
    const infeas = results.filter((b) => !b.feasible).slice().sort((a, b) => a.minRecV - b.minRecV);
    return { feasible: feas, infeasible: infeas };
  }, [results, maxTotal, sortBy]);

  const th = parseFloat(threshold) || 0;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const renderRow = (b, rank) => {
    const gun = b.gun;
    const open = expanded === gun.id;
    return (
      <React.Fragment key={gun.id}>
        <div
          className={`gmo-rrow ${b.feasible ? '' : 'infeasible'}`}
          onClick={() => setExpanded(open ? null : gun.id)}
        >
          <div className="rnk">{b.feasible ? rank : '—'}</div>
          <img src={gun.image || gun.icon || ''} onError={(e) => (e.target.style.visibility = 'hidden')} alt="" />
          <div className="gn">
            <b>{gun.shortName || gun.name}</b>
            <div className="sub">{gun.name}</div>
            {!b.feasible && <span className="gmo-badge">min achievable {b.minRecV}</span>}
          </div>
          <div className="col recv">
            <div className="k">Recoil ↕</div>
            <div className={`v ${b.finalRecV <= th ? 'ok' : 'no'}`}>
              {b.finalRecV} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>/ {th}</span>
            </div>
          </div>
          <div className="col ergo">
            <div className="k">Ergo</div>
            <div className="v">{b.finalErgo}</div>
          </div>
          <div className="col gp">
            <div className="k">Gun price</div>
            <div className="v">{rub(gun.price)}</div>
          </div>
          <div className="col mc">
            <div className="k">Mods cost</div>
            <div className="v">{rub(b.res.cost)}</div>
          </div>
          <div className="col tc">
            <div className="k">Total price</div>
            <div className="v">{rub(b.totalCost)}</div>
          </div>
        </div>
        {open && (
          <div className="gmo-expand">
            <div className="exp-actions">
              <button
                disabled={exportingId === gun.id}
                onClick={async () => {
                  setExportingId(gun.id);
                  try {
                    await exportCardImage(b);
                  } finally {
                    setExportingId(null);
                  }
                }}
              >
                {exportingId === gun.id ? '⏳ Generating image…' : '📥 Download card (PNG)'}
              </button>
              <button onClick={() => openCardTab(b)}>📤 Open card in a new tab</button>
              <button onClick={() => { if (stashBuildForEdit(b)) navigate('/WeaponBuild'); }}>
                ✏️ Edit build in Weapon Build
              </button>
            </div>
            <div className="gmo-build">
              {b.msgs.map((m, i) => (
                <div key={i} className={`gmo-note ${m.ok ? 'ok' : 'warn'}`}>
                  {m.t}
                </div>
              ))}
              <div className="gmo-row basegun">
                <img src={gun.image || gun.icon || ''} onError={(e) => (e.target.style.visibility = 'hidden')} alt="" />
                <div className="slot accent">Base gun</div>
                <div className="nm">
                  <b>{gun.name}</b>
                  <div className="mods">
                    base ergo {b.baseErgo} · recoil {b.baseRecV}/{b.baseRecH}
                  </div>
                </div>
                <div className="pr">{rub(gun.price)}</div>
              </div>
              {b.res.picks.length ? (
                <BuildRows picks={b.res.picks} />
              ) : (
                <div className="gmo-empty">No mods in this build (the base gun already meets the threshold)</div>
              )}
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="gmo">
      <style>{GMO_CSS}</style>

      <header className="gmo-header">
        <h1>🎯 Caliber Optimizer</h1>
        <p>Select a caliber and the tool finds guns that can be modded down to your recoil target for the lowest price — ranked so you can see which one gives the best value.</p>
      </header>

      {loadErr && <div className="gmo-note warn" style={{ margin: 16 }}>Failed to load data: {loadErr}</div>}
      {!data && !loadErr && <div className="gmo-empty">Loading gun/mod data…</div>}

      {data && (
        <div className="gmo-wrap">
          <div className="gmo-side">
            <button className="gmo-go" onClick={run} disabled={!canRun}>
              {running ? '⏳ Calculating…' : '🔍 Find best-value gun'}
            </button>
            <label>Select caliber</label>
            <div className="gmo-gunlist">
              {calibers.length ? (
                calibers.map(([c, n]) => (
                  <div
                    key={c}
                    className={`gitem ${c === caliber ? 'on' : ''}`}
                    onClick={() => setCaliber(c)}
                    style={{ padding: '9px 12px' }}
                  >
                    <div className="gi-info">
                      <b>{c}</b>
                      <div className="gi-sub">{n} guns</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="none">No caliber data</div>
              )}
            </div>

            <label>Vertical recoil ≤ (target)</label>
            <input
              type="number"
              min="0"
              step="5"
              placeholder="e.g. 300"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />

            <label>Additional constraints</label>
            <div className="gmo-cons">
              <div className="con">
                <label className="inline">
                  <input type="checkbox" checked={needSup} onChange={(e) => setNeedSup(e.target.checked)} />
                  Suppressor required
                </label>
              </div>
              <div className="con">
                <span>Magazine capacity ≥</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 30"
                  value={minCap}
                  onChange={(e) => setMinCap(e.target.value)}
                />{' '}
                rounds
              </div>
              <div className="con">
                <span>Total price cap ≤</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="₽ unlimited"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                />
              </div>
            </div>
            <label>🔒 Required mods (forced into the build)</label>
            <ModPicker
              kind="include"
              MODLIST={MODLIST}
              MODS={MODS}
              selected={include}
              onAdd={(id) => {
                setInclude((prev) => new Set(prev).add(id));
                setExclude((prev) => {
                  const n = new Set(prev);
                  n.delete(id);
                  return n;
                });
              }}
              onRemove={(id) =>
                setInclude((prev) => {
                  const n = new Set(prev);
                  n.delete(id);
                  return n;
                })
              }
            />

            <label>🚫 Excluded mods</label>
            <ModPicker
              kind="exclude"
              MODLIST={MODLIST}
              MODS={MODS}
              selected={exclude}
              onAdd={(id) => {
                setExclude((prev) => new Set(prev).add(id));
                setInclude((prev) => {
                  const n = new Set(prev);
                  n.delete(id);
                  return n;
                });
              }}
              onRemove={(id) =>
                setExclude((prev) => {
                  const n = new Set(prev);
                  n.delete(id);
                  return n;
                })
              }
            />

            <label className="inline mt">
              <input type="checkbox" checked={onlyBuy} onChange={(e) => setOnlyBuy(e.target.checked)} />
              Only purchasable mods (with a price)
            </label>

            <div className="gmo-hint">
              💡 Total price = gun price + mods cost • Guns that can never reach the target are listed at the bottom, each
              with its lowest achievable recoil so you can still compare • If you turn off "Only purchasable mods", mods without a price count as ₽0 — the price ranking may be off
            </div>
          </div>

          <div className="gmo-main">
            {running && (
              <div className="gmo-progress">
                <div className="plabel">
                  Calculating {progress.done}/{progress.total}
                  {progress.name ? ` — ${progress.name}…` : ''}
                </div>
                <div className="ptrack">
                  <div className="pfill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {!running && results && (
              <div className="gmo-rank">
                <div className="gmo-rank-head">
                  <div className="rnk">#</div>
                  <div style={{ width: 72 }} />
                  <div className="gn">Gun</div>
                  <div className="col recv">Recoil ↕</div>
                  <div className="col ergo">Ergo</div>
                  <div className="col gp">Gun price</div>
                  <div className="col mc">Mods cost</div>
                  <div className="col tc">Total price</div>
                </div>

                <div className="gmo-grouphdr">
                  <span>
                    ✅ Meets target (Recoil ≤ {th}) — {feasible.length} guns
                  </span>
                  <span className="sortby">
                    Sort by{' '}
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      {Object.entries(SORTS).map(([k, s]) => (
                        <option key={k} value={k}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
                {feasible.length ? (
                  feasible.map((b, i) => renderRow(b, i + 1))
                ) : (
                  <div className="gmo-empty">
                    No gun in this caliber can be modded to meet the target
                    {parseFloat(maxTotal) > 0 ? ' within the price cap you set' : ''}
                  </div>
                )}

                {infeasible.length > 0 && (
                  <>
                    <div className="gmo-grouphdr dim">
                      ❌ Below target — {infeasible.length} guns • sorted by lowest achievable recoil
                    </div>
                    {infeasible.map((b) => renderRow(b, 0))}
                  </>
                )}
              </div>
            )}

            {!running && !results && (
              <div className="gmo-build">
                <div className="gmo-empty">Select a caliber, set a recoil target, and click “Find best-value gun”</div>
              </div>
            )}

            <footer className="gmo-footer">
              Data: tarkov.dev • Only purchasable mods (with a price) are considered, and optic/rail/flashlight slots are skipped •
              The lowest price is found via a binary search over the mod budget — it is an estimate
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
