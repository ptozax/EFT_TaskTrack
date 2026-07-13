import React, { useState, useEffect, useMemo } from 'react';
import {
  DATA_URL,
  rub,
  computeBuild,
  exportCardImage,
  openCardTab,
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
        {diff} จาก {base}
      </div>
    );
  };

  return (
    <div className="gmo">
      <style>{GMO_CSS}</style>

      <header className="gmo-header">
        <h1>⚙ Tarkov Gun Mod Optimizer</h1>
        <p>เลือกปืน ตั้งเป้าหมายและงบประมาณ — ระบบจะหาชุดมอดที่ให้ผลดีที่สุดจากช่องที่ติดตั้งได้</p>
      </header>

      {loadErr && <div className="gmo-note warn" style={{ margin: 16 }}>โหลดข้อมูลไม่สำเร็จ: {loadErr}</div>}
      {!data && !loadErr && <div className="gmo-empty">กำลังโหลดข้อมูลปืน/มอด…</div>}

      {data && (
        <div className="gmo-wrap">
          <div className="gmo-side">
            <label>ค้นหา / เลือกปืน</label>
            <input
              type="text"
              placeholder="พิมพ์ชื่อปืน เช่น M4A1, AK-74..."
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
                <div className="none">ไม่พบปืนที่ตรงกับคำค้นหา</div>
              )}
            </div>

            <label>เป้าหมาย (Objective)</label>
            <div className="gmo-seg">
              {[
                ['recoil', 'Recoil ต่ำ'],
                ['ergo', 'Ergo สูง'],
                ['balanced', 'สมดุล'],
              ].map(([v, txt]) => (
                <button key={v} className={objective === v ? 'on' : ''} onClick={() => setObjective(v)}>
                  {txt}
                </button>
              ))}
            </div>
            <div className="gmo-hint">
              💡 <b>สมดุล</b> = ลด recoil ลงครึ่งทางของที่ลดได้สุด แล้วดัน ergo ให้สูงสุด • อยากคุมเอง: เลือก{' '}
              <b>Ergo สูง</b> แล้วตั้งเพดาน <b>Recoil ≤</b> ด้านล่าง ("Recoil ต่ำ" = ลดสุดๆ ไม่สน ergo)
            </div>

            <label>งบประมาณมอด (₽) — 0 = ไม่จำกัด</label>
            <input type="number" min="0" step="1000" value={budget} onChange={(e) => setBudget(e.target.value)} />

            <label>เงื่อนไข (Constraints)</label>
            <div className="gmo-cons">
              <div className="con">
                <span>Recoil แนวตั้ง ≤</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  placeholder="ไม่จำกัด"
                  value={maxRecoil}
                  onChange={(e) => setMaxRecoil(e.target.value)}
                />
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
                <label className="inline">
                  <input type="checkbox" checked={needSup} onChange={(e) => setNeedSup(e.target.checked)} />
                  ต้องมี Suppressor
                </label>
              </div>
            </div>

            <label>🔒 Mod ต้องใส่ (บังคับให้อยู่ในชุด)</label>
            <ModPicker
              kind="include"
              MODLIST={MODLIST}
              MODS={MODS}
              selected={include}
              onAdd={(id) => addPick('include', id)}
              onRemove={(id) => removePick('include', id)}
            />

            <label>🚫 Mod ห้ามใส่</label>
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
              ข้ามช่องกล้อง/ศูนย์/ราง/ไฟฉาย (แนะนำ — กันฟาร์ม ergo)
            </label>
            <label className="inline">
              <input type="checkbox" checked={onlyBuy} onChange={(e) => setOnlyBuy(e.target.checked)} />
              เฉพาะมอดที่ซื้อได้ (มีราคา)
            </label>

            <button className="gmo-go" onClick={run} disabled={!gunId}>
              🔧 หาชุดที่ดีที่สุด
            </button>
            <button
              className="gmo-go2"
              onClick={async () => {
                setExporting(true);
                try {
                  await exportCardImage(build);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={!build || exporting}
            >
              {exporting ? '⏳ กำลังสร้างรูป…' : '📥 ดาวน์โหลดการ์ดบิลด์ (PNG)'}
            </button>
            <button className="gmo-go2" onClick={() => openCardTab(build)} disabled={!build}>
              📤 เปิดการ์ดในแท็บใหม่
            </button>
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
                    <div className="k">Recoil ↕ แนวตั้ง</div>
                    <div className="v">{build.finalRecV}</div>
                    {d(build.finalRecV, build.baseRecV, false)}
                  </div>
                  <div className="stat">
                    <div className="k">Recoil ↔ แนวนอน</div>
                    <div className="v">{build.finalRecH}</div>
                    {d(build.finalRecH, build.baseRecH, false)}
                  </div>
                  <div className="stat">
                    <div className="k">ความจุแม็ก</div>
                    <div className="v">{build.res.cap || '—'}</div>
                    <div className="stat-d">{build.res.hasSup ? 'มี Suppressor' : ''}</div>
                  </div>
                  <div className="stat">
                    <div className="k">ราคารวม (ปืน+มอด)</div>
                    <div className="v" style={{ fontSize: 18 }}>
                      {rub(build.totalCost)}
                    </div>
                    <div className="stat-d">
                      มอด {rub(build.res.cost)}
                      {build.budgetUsed != null ? ` / งบ ${rub(build.budgetUsed)}` : ''}
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
                    <div className="slot accent">ปืนฐาน</div>
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
                    <div className="gmo-empty">ไม่มีช่องมอดที่เหมาะสม</div>
                  )}
                </div>
              </>
            ) : (
              <div className="gmo-build">
                <div className="gmo-empty">เลือกปืนแล้วกด “หาชุดที่ดีที่สุด”</div>
              </div>
            )}
            <footer className="gmo-footer">
              ข้อมูล: tarkov.dev • recoilModifier เป็น % ของ base recoil, ergonomicsModifier เป็นค่าบวก •
              ผลลัพธ์เป็นการประมาณแบบ greedy
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
