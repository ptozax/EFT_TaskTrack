import React from 'react';

/* =========================================================================
 * ErrorBoundary — กัน "จอขาว" เวลา render crash หรือ lazy chunk โหลดไม่ได้
 *   - chunk error (มัก = deploy เวอร์ชันใหม่ทำให้ chunk เก่า 404) -> reload อัตโนมัติ 1 ครั้ง
 *   - error อื่น -> โชว์ข้อความ + ปุ่ม Reload แทนจอขาว (navbar ยังอยู่ นำทางต่อได้)
 * ========================================================================= */
const CHUNK_ERR = /Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch dynamically|ChunkLoadError/i;
const RELOAD_FLAG = 'eft_chunk_reloaded';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    // chunk โหลดไม่ได้ -> น่าจะมี deploy ใหม่ chunk เก่าเลย 404 -> reload หนึ่งครั้ง (กัน loop ด้วย flag)
    if (CHUNK_ERR.test(error?.message || '') && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const isChunk = CHUNK_ERR.test(error?.message || '');
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ marginBottom: 8 }}>{isChunk ? 'New version available' : 'This page hit an error'}</h2>
        <p style={{ color: '#94a3b8', marginBottom: 20, maxWidth: 460, marginInline: 'auto' }}>
          {isChunk ? 'เว็บอัปเดตเวอร์ชันใหม่ — กด Reload เพื่อโหลดล่าสุด' : 'เกิดข้อผิดพลาดในการแสดงผลหน้านี้ ลองรีโหลด'}
        </p>
        <button
          onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); window.location.reload(); }}
          style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid #c7a34f', background: '#3b300f', color: '#f0d98a', fontWeight: 700, cursor: 'pointer' }}
        >
          🔄 Reload
        </button>
        <pre style={{ marginTop: 20, fontSize: 11, color: '#64748b', whiteSpace: 'pre-wrap', maxWidth: 600, marginInline: 'auto', overflowX: 'auto' }}>
          {String(error?.message || error)}
        </pre>
      </div>
    );
  }
}
