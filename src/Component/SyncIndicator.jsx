import { useEffect, useState } from 'react';
import { useSyncStatus } from '../data/gameStore';

/* =========================================================================
 * SyncIndicator — ป้ายมุมจอบอกสถานะการดึงข้อมูลสดจาก tarkov.dev
 *   loading -> "Syncing live data…" (สปินเนอร์, ค้างไว้จนเสร็จ)
 *   done    -> "Live data updated" (เขียว, หายเองใน 2.5 วิ)
 *   offline -> "Offline — using cached data" (แดง, หายเองใน 5 วิ)
 * ========================================================================= */
const CFG = {
  loading: { bg: '#3b300f', border: '#c7a34f', text: '#f0d98a', label: 'Syncing live data…', spin: true },
  done: { bg: '#0f2e1a', border: '#22c55e', text: '#86efac', label: 'Live data updated', spin: false },
  offline: { bg: '#2e1a1a', border: '#ef4444', text: '#fca5a5', label: 'Offline — using cached data', spin: false },
};

export default function SyncIndicator() {
  const status = useSyncStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status === 'loading') { setShow(true); return; }
    if (status === 'done') { setShow(true); const t = setTimeout(() => setShow(false), 2500); return () => clearTimeout(t); }
    if (status === 'offline') { setShow(true); const t = setTimeout(() => setShow(false), 5000); return () => clearTimeout(t); }
    setShow(false);
  }, [status]);

  if (!show || status === 'idle') return null;
  const c = CFG[status];

  return (
    <div
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 3000,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 999,
        background: c.bg, border: `1px solid ${c.border}`, color: c.text,
        font: '500 13px/1 system-ui, sans-serif', boxShadow: '0 4px 16px rgba(0,0,0,.4)',
        animation: 'eftSyncIn .25s ease-out',
      }}
    >
      <style>{`@keyframes eftSyncSpin{to{transform:rotate(360deg)}}@keyframes eftSyncIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      {c.spin ? (
        <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${c.border}`, borderTopColor: 'transparent', animation: 'eftSyncSpin .7s linear infinite', display: 'inline-block' }} />
      ) : (
        <span style={{ fontSize: 14, lineHeight: 1 }}>{status === 'done' ? '✓' : '⚠'}</span>
      )}
      {c.label}
    </div>
  );
}
