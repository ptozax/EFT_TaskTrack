import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DATA_URL,
  rub,
  computeBuild,
} from './optimizerCore.jsx';
import { getData } from '../data/gameStore';
import {
  exportCardImage,
  openCardTab,
  stashBuildForEdit,
  BuildRows,
  ModPicker,
  GMO_CSS,
} from './optimizerCore.jsx';

/* =========================================================================
 * Tarkov Gun Mod Optimizer  (ported from /mod/index.html)
 * เลือกปืน ตั้งเป้าหมาย/งบ/เงื่อนไข แล้วระบบหาชุดมอดที่ดีที่สุดจากช่องที่ติดตั้งได้
 * ข้อมูล preprocess จาก tarkov.dev -> public/optimizer_data.json
 * core logic + shared components live in ./optimizerCore.jsx
 * ========================================================================= */

/* ------------------------------ main page -------------------------------- */
export default function WeaponOptimizer() {
  const navigate = useNavigate();
  const [data, setData] = useState(null); // {guns, mods}
  const [loadErr, setLoadErr] = useState('');

  const [search, setSearch] = useState('');
  const [gunId, setGunId] = useState('');
  const [objective, setObjective] = useState('ergo');
  const [budget, setBudget] = useState(0);
  const [maxRecoil, setMaxRecoil] = useState('62');
  const [minCap, setMinCap] = useState('30');
  const [needSup, setNeedSup] = useState(false);
  const [skipOptics, setSkipOptics] = useState(true);
  const [onlyBuy, setOnlyBuy] = useState(true);
  const [include, setInclude] = useState(() => new Set());
  const [exclude, setExclude] = useState(() => new Set());

  const [build, setBuild] = useState(null);
  const [exporting, setExporting] = useState(false);

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
    };
  }, []);

  const GUNS = data?.guns || [];
  const MODS = data?.mods || {};
  const MODLIST = useMemo(
    () => Object.values(MODS).sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name)),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GUNS.filter((g) => !q || g.name.toLowerCase().includes(q) || (g.shortName || '').toLowerCase().includes(q));
  }, [search, GUNS]);

  const addPick = (kind, id) => {
    if (kind === 'include') {
      setInclude((prev) => new Set(prev).add(id));
      setExclude((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } else {
      setExclude((prev) => new Set(prev).add(id));
      setInclude((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };
  const removePick = (kind, id) =>
    (kind === 'include' ? setInclude : setExclude)((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });

  const run = () => {
    const gun = GUNS.find((g) => g.id === gunId);
    if (!gun) return;
    const C = {
      onlyBuy,
      minCap: parseInt(minCap) || 0,
      needSup,
      maxRecoil: parseFloat(maxRecoil) || 0,
      skipOptics,
      budget: parseFloat(budget) || 0,
      include,
      exclude,
    };
    setBuild(computeBuild(gun, C, objective, MODS));
  };

  const d = (final, base, goodIsUp) => {
    const diff = final - base;
    if (diff === 0) return null;
    const cls = diff > 0 === goodIsUp ? 'up' : 'down';
    return (
      <div className={`stat-d ${cls}`}>
        {diff > 0 ? '+' : ''}
        {diff} from {base}
      </div>
    );
  };

  return (
    <div className="gmo">
      <style>{GMO_CSS}</style>

      <header className="gmo-header">
        <h1>⚙ Tarkov Gun Mod Optimizer</h1>
        <p>Select a gun, set your objective and budget — the system finds the best-performing mod set from the available slots.</p>
      </header>

      {loadErr && <div className="gmo-note warn" style={{ margin: 16 }}>Failed to load data: {loadErr}</div>}
      {!data && !loadErr && <div className="gmo-empty">Loading gun/mod data…</div>}

      {data && (
        <div className="gmo-wrap">
          <div className="gmo-side">
            {/* action toolbar */}
            <div className="gmo-toolbar">
              <button className="gmo-tool tile primary" onClick={run} disabled={!gunId} title="Find best build">
                🔧<span className="lbl">Find build</span>
              </button>
              <button
                className="gmo-tool tile"
                onClick={async () => { setExporting(true); try { await exportCardImage(build); } finally { setExporting(false); } }}
                disabled={!build || exporting} title="Download build card (PNG)"
              >
                {exporting ? '⏳' : '📥'}<span className="lbl">Download</span>
              </button>
              <button className="gmo-tool tile" onClick={() => openCardTab(build)} disabled={!build} title="Open card in a new tab">
                📤<span className="lbl">Open card</span>
              </button>
              <button className="gmo-tool tile" onClick={() => { if (stashBuildForEdit(build)) navigate('/WeaponBuild'); }} disabled={!build} title="Edit build in Weapon Build">
                ✏️<span className="lbl">Edit build</span>
              </button>
            </div>
            <label>Search / select a gun</label>
            <input
              type="text"
              placeholder="Type a gun name, e.g. M4A1, AK-74..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="gmo-gunlist">
              {filtered.length ? (
                filtered.map((g) => (
                  <div
                    key={g.id}
                    className={`gitem ${g.id === gunId ? 'on' : ''}`}
                    onClick={() => setGunId(g.id)}
                  >
                    <img
                      src={g.image || g.icon || ''}
                      onError={(e) => (e.target.style.visibility = 'hidden')}
                      alt=""
                    />
                    <div className="gi-info">
                      <b>{g.shortName || g.name}</b>
                      <div className="gi-sub">
                        {g.name} · {g.caliber || '?'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="none">No guns match your search</div>
              )}
            </div>

            <label>Objective</label>
            <div className="gmo-seg">
              {[
                ['recoil', 'Low recoil'],
                ['ergo', 'High ergo'],
                ['balanced', 'Balanced'],
              ].map(([v, txt]) => (
                <button key={v} className={objective === v ? 'on' : ''} onClick={() => setObjective(v)}>
                  {txt}
                </button>
              ))}
            </div>
            <div className="gmo-hint">
              💡 <b>Balanced</b> = cut recoil halfway to its minimum, then maximize ergo • For full control: pick{' '}
              <b>High ergo</b> and set a <b>Recoil ≤</b> ceiling below ("Low recoil" = minimize recoil, ignoring ergo)
            </div>

            <label>Mod budget (₽) — 0 = unlimited</label>
            <input type="number" min="0" step="1000" value={budget} onChange={(e) => setBudget(e.target.value)} />

            <label>Constraints</label>
            <div className="gmo-cons">
              <div className="con">
                <span>Vertical recoil ≤</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  placeholder="unlimited"
                  value={maxRecoil}
                  onChange={(e) => setMaxRecoil(e.target.value)}
                />
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
                <label className="inline">
                  <input type="checkbox" checked={needSup} onChange={(e) => setNeedSup(e.target.checked)} />
                  Suppressor required
                </label>
              </div>
            </div>

            <label>🔒 Required mods (forced into the build)</label>
            <ModPicker
              kind="include"
              MODLIST={MODLIST}
              MODS={MODS}
              selected={include}
              onAdd={(id) => addPick('include', id)}
              onRemove={(id) => removePick('include', id)}
            />

            <label>🚫 Excluded mods</label>
            <ModPicker
              kind="exclude"
              MODLIST={MODLIST}
              MODS={MODS}
              selected={exclude}
              onAdd={(id) => addPick('exclude', id)}
              onRemove={(id) => removePick('exclude', id)}
            />

            <label className="inline mt">
              <input type="checkbox" checked={skipOptics} onChange={(e) => setSkipOptics(e.target.checked)} />
              Skip optic/sight/rail/flashlight slots (recommended — prevents ergo farming)
            </label>
            <label className="inline">
              <input type="checkbox" checked={onlyBuy} onChange={(e) => setOnlyBuy(e.target.checked)} />
              Only purchasable mods (with a price)
            </label>

          </div>

          <div className="gmo-main">
            {build ? (
              <>
                <div className="gmo-stats">
                  <div className="stat">
                    <div className="k">Ergonomics</div>
                    <div className="v">{build.finalErgo}</div>
                    {d(build.finalErgo, build.baseErgo, true)}
                  </div>
                  <div className="stat">
                    <div className="k">Recoil ↕ Vertical</div>
                    <div className="v">{build.finalRecV}</div>
                    {d(build.finalRecV, build.baseRecV, false)}
                  </div>
                  <div className="stat">
                    <div className="k">Recoil ↔ Horizontal</div>
                    <div className="v">{build.finalRecH}</div>
                    {d(build.finalRecH, build.baseRecH, false)}
                  </div>
                  <div className="stat">
                    <div className="k">Magazine capacity</div>
                    <div className="v">{build.res.cap || '—'}</div>
                    <div className="stat-d">{build.res.hasSup ? 'Suppressor equipped' : ''}</div>
                  </div>
                  <div className="stat">
                    <div className="k">Total price (gun + mods)</div>
                    <div className="v" style={{ fontSize: 18 }}>
                      {rub(build.totalCost)}
                    </div>
                    <div className="stat-d">
                      Mods {rub(build.res.cost)}
                      {build.budgetUsed != null ? ` / budget ${rub(build.budgetUsed)}` : ''}
                    </div>
                  </div>
                </div>

                <div className="gmo-build">
                  {build.msgs.map((m, i) => (
                    <div key={i} className={`gmo-note ${m.ok ? 'ok' : 'warn'}`}>
                      {m.t}
                    </div>
                  ))}
                  <div className="gmo-row basegun">
                    <img
                      src={build.gun.image || build.gun.icon || ''}
                      onError={(e) => (e.target.style.visibility = 'hidden')}
                      alt=""
                    />
                    <div className="slot accent">Base gun</div>
                    <div className="nm">
                      <b>{build.gun.name}</b>
                      <div className="mods">
                        base ergo {build.baseErgo} · recoil {build.baseRecV}/{build.baseRecH}
                      </div>
                    </div>
                    <div className="pr">{rub(build.gun.price)}</div>
                  </div>
                  {build.res.picks.length ? (
                    <BuildRows picks={build.res.picks} />
                  ) : (
                    <div className="gmo-empty">No suitable mod slots</div>
                  )}
                </div>
              </>
            ) : (
              <div className="gmo-build">
                <div className="gmo-empty">Select a gun and click “Find best build”</div>
              </div>
            )}
            <footer className="gmo-footer">
              Data: tarkov.dev • recoilModifier is a % of base recoil, ergonomicsModifier is an additive value •
              results are a greedy approximation
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
