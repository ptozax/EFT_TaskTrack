import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DATA_URL,
  rub,
  findCheapestBuild,
  exportCardImage,
  openCardTab,
  BuildRows,
  ModPicker,
  GMO_CSS,
} from './optimizerCore.jsx';

/* =========================================================================
 * Caliber Optimizer
 * เลือก caliber → ระบบไล่คำนวณปืนทุกรุ่นใน caliber นั้น หาว่ารุ่นไหนโม recoil
 * ลงมาถึง threshold ได้ด้วยราคารวม (ปืน+มอด) ต่ำที่สุด แล้วจัดอันดับให้เห็น
 * ใช้ core logic ร่วมกับ WeaponOptimizer.jsx จาก ./optimizerCore.jsx
 * ========================================================================= */

export default function CaliberOptimizer() {
  const [data, setData] = useState(null); // {guns, mods}
  const [loadErr, setLoadErr] = useState('');

  const [caliber, setCaliber] = useState('');
  const [threshold, setThreshold] = useState('');
  const [needSup, setNeedSup] = useState(false);
  const [minCap, setMinCap] = useState('');
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
    fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
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
    total: { label: 'ราคารวมถูกสุด', cmp: (a, b) => a.totalCost - b.totalCost },
    mod: { label: 'ค่ามอดถูกสุด', cmp: (a, b) => a.res.cost - b.res.cost },
    recoil: { label: 'Recoil ต่ำสุด', cmp: (a, b) => a.finalRecV - b.finalRecV },
    ergo: { label: 'Ergo สูงสุด', cmp: (a, b) => b.finalErgo - a.finalErgo },
    gun: { label: 'ราคาปืนถูกสุด', cmp: (a, b) => (a.gun.price || 0) - (b.gun.price || 0) },
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
            {!b.feasible && <span className="gmo-badge">ต่ำสุดที่ทำได้ {b.minRecV}</span>}
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
            <div className="k">ราคาปืน</div>
            <div className="v">{rub(gun.price)}</div>
          </div>
          <div className="col mc">
            <div className="k">ค่ามอด</div>
            <div className="v">{rub(b.res.cost)}</div>
          </div>
          <div className="col tc">
            <div className="k">ราคารวม</div>
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
                {exportingId === gun.id ? '⏳ กำลังสร้างรูป…' : '📥 ดาวน์โหลดการ์ด (PNG)'}
              </button>
              <button onClick={() => openCardTab(b)}>📤 เปิดการ์ดในแท็บใหม่</button>
            </div>
            <div className="gmo-build">
              {b.msgs.map((m, i) => (
                <div key={i} className={`gmo-note ${m.ok ? 'ok' : 'warn'}`}>
                  {m.t}
                </div>
              ))}
              <div className="gmo-row basegun">
                <img src={gun.image || gun.icon || ''} onError={(e) => (e.target.style.visibility = 'hidden')} alt="" />
                <div className="slot accent">ปืนฐาน</div>
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
                <div className="gmo-empty">ไม่มีมอดในชุด (ปืนฐานผ่าน threshold อยู่แล้ว)</div>
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
        <p>เลือก caliber แล้วระบบจะหาปืนที่โม recoil ลงถึงเป้าหมายได้ด้วยราคาต่ำสุด — จัดอันดับให้เห็นว่าคุ้มสุดคือรุ่นไหน</p>
      </header>

      {loadErr && <div className="gmo-note warn" style={{ margin: 16 }}>โหลดข้อมูลไม่สำเร็จ: {loadErr}</div>}
      {!data && !loadErr && <div className="gmo-empty">กำลังโหลดข้อมูลปืน/มอด…</div>}

      {data && (
        <div className="gmo-wrap">
          <div className="gmo-side">
            <label>เลือก Caliber</label>
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
                      <div className="gi-sub">{n} กระบอก</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="none">ไม่มีข้อมูล caliber</div>
              )}
            </div>

            <label>Recoil แนวตั้ง ≤ (เป้าหมาย)</label>
            <input
              type="number"
              min="0"
              step="5"
              placeholder="เช่น 300"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />

            <label>เงื่อนไขเสริม (Constraints)</label>
            <div className="gmo-cons">
              <div className="con">
                <label className="inline">
                  <input type="checkbox" checked={needSup} onChange={(e) => setNeedSup(e.target.checked)} />
                  ต้องมี Suppressor
                </label>
              </div>
              <div className="con">
                <span>ความจุแม็ก ≥</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="เช่น 30"
                  value={minCap}
                  onChange={(e) => setMinCap(e.target.value)}
                />{' '}
                นัด
              </div>
              <div className="con">
                <span>งบเพดานราคารวม ≤</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="₽ ไม่จำกัด"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                />
              </div>
            </div>
            <label>🔒 Mod ต้องใส่ (บังคับให้อยู่ในชุด)</label>
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

            <label>🚫 Mod ห้ามใส่</label>
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
              เฉพาะมอดที่ซื้อได้ (มีราคา)
            </label>

            <div className="gmo-hint">
              💡 ราคารวม = ราคาปืน + ค่ามอด • ปืนที่โมยังไงก็ไม่ถึงเป้าหมายจะอยู่ท้ายตาราง พร้อมค่า recoil ต่ำสุดที่ทำได้
              เพื่อให้เทียบได้ • ถ้าปิด "เฉพาะมอดที่ซื้อได้" มอดที่ไม่มีราคาจะถูกนับเป็น ₽0 — อันดับราคาอาจเพี้ยน
            </div>

            <button className="gmo-go" onClick={run} disabled={!canRun}>
              {running ? '⏳ กำลังคำนวณ…' : '🔍 หาปืนที่คุ้มสุด'}
            </button>
          </div>

          <div className="gmo-main">
            {running && (
              <div className="gmo-progress">
                <div className="plabel">
                  กำลังคำนวณ {progress.done}/{progress.total}
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
                  <div className="gn">ปืน</div>
                  <div className="col recv">Recoil ↕</div>
                  <div className="col ergo">Ergo</div>
                  <div className="col gp">ราคาปืน</div>
                  <div className="col mc">ค่ามอด</div>
                  <div className="col tc">ราคารวม</div>
                </div>

                <div className="gmo-grouphdr">
                  <span>
                    ✅ ผ่านเป้าหมาย (Recoil ≤ {th}) — {feasible.length} รุ่น
                  </span>
                  <span className="sortby">
                    เรียงตาม{' '}
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
                    ไม่มีปืนใน caliber นี้ที่โมถึงเป้าหมายได้
                    {parseFloat(maxTotal) > 0 ? ' ภายใต้งบเพดานที่ตั้งไว้' : ''}
                  </div>
                )}

                {infeasible.length > 0 && (
                  <>
                    <div className="gmo-grouphdr dim">
                      ❌ ยังไม่ถึงเป้าหมาย — {infeasible.length} รุ่น • เรียงตาม recoil ต่ำสุดที่ทำได้
                    </div>
                    {infeasible.map((b) => renderRow(b, 0))}
                  </>
                )}
              </div>
            )}

            {!running && !results && (
              <div className="gmo-build">
                <div className="gmo-empty">เลือก caliber และตั้งเป้าหมาย Recoil แล้วกด “หาปืนที่คุ้มสุด”</div>
              </div>
            )}

            <footer className="gmo-footer">
              ข้อมูล: tarkov.dev • คำนวณเฉพาะมอดที่ซื้อได้ (มีราคา) และข้ามช่องกล้อง/ราง/ไฟฉาย •
              ราคาต่ำสุดหาแบบ binary-search บนงบมอด — เป็นการประมาณ
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
