// ============================================================
// 出生档案库 (合盘用): localStorage 存储 (爸爸: 选择与当下本命盘合盘的档案)
// 站内暂无用户体系 → 先存访客本地; 后续可迁 Supabase
// ============================================================
import type { BirthData } from '@/lib/astro/chart';

export interface Archive {
  id: string;
  label: string;
  birth: BirthData;
  savedAt: number;
}

const KEY = 'astro-archives-v1';

export function listArchives(): Archive[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveArchive(birth: BirthData): Archive {
  const a: Archive = {
    id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    label: (birth.label ?? '').trim() || '未命名',
    birth,
    savedAt: Date.now(),
  };
  const l = listArchives();
  l.unshift(a);
  try { window.localStorage.setItem(KEY, JSON.stringify(l.slice(0, 200))); } catch { /* 满/隐私模式 */ }
  return a;
}

export function deleteArchive(id: string) {
  try { window.localStorage.setItem(KEY, JSON.stringify(listArchives().filter((x) => x.id !== id))); } catch { /* ignore */ }
}

export function getArchive(id: string): Archive | null {
  return listArchives().find((x) => x.id === id) ?? null;
}
