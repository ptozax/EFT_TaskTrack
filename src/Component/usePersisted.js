import { useEffect, useRef, useState } from 'react';

/**
 * อ่านค่าจาก localStorage แบบไม่โยน error
 * (โหมดส่วนตัว / ข้อมูลเก่าที่ parse ไม่ได้ -> คืนค่า fallback)
 */
export const readStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* โหมดส่วนตัวเขียนไม่ได้ */ }
};

/**
 * useState ที่จำค่าไว้ใน localStorage
 *
 * ใช้แทนรูปแบบเดิมที่เขียนซ้ำทุกตัว:
 *   useState(() => JSON.parse(localStorage.getItem(KEY)) || [])
 *   + useEffect(() => { if (isRefresh) localStorage.setItem(KEY, ...) }, [value, isRefresh])
 *
 * ธง isRefresh ในของเดิมมีไว้กันเขียนทับก่อนโหลดเสร็จ ซึ่งไม่จำเป็น —
 * ค่าเริ่มต้นอ่านจาก localStorage อยู่แล้ว รอบแรกจึงเขียนค่าเดิมกลับไปเฉย ๆ
 * (และถ้า parse พัง ของเดิมจะโยน error ตั้งแต่ตอน init ทำให้ทั้งหน้าไม่ขึ้น)
 */
export function usePersisted(key, fallback) {
  const [value, setValue] = useState(() => readStored(key, fallback));

  // ข้ามการเขียนรอบแรก ค่าที่เพิ่งอ่านมาไม่ต้องเขียนกลับ
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    writeStored(key, value);
  }, [key, value]);

  return [value, setValue];
}
