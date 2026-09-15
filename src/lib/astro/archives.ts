// ============================================================
// 出生档案库: 双通道 — 登录 → 云端 (Supabase user_archives, 仅本人可见);
//   未登录 → 本机浏览器 (localStorage)
// 爸爸规划: 出生资料录一次, 占星/八字/紫微/塔罗全板块共用
// 云端表: user_archives (id, user_id, label, birth jsonb, note, contact, created_at, updated_at)
// ============================================================
import type { BirthData } from '@/lib/astro/chart';
import { supabaseBrowser } from '@/lib/supabase';

export interface Archive {
  id: string;
  label: string;
  birth: BirthData;
  note: string;
  contact: string;
  savedAt: number;
  cloud?: boolean;
}
export interface ArchiveExtra { note?: string; contact?: string }

const KEY = 'astro-archives-v1';
const TABLE = 'user_archives';

/** 坏档案兜底: 缺 birth / 关键字段非法的条目丢弃 (脏数据/旧版本残留不能炸页面);
 *  字段尽力修复 (数字化), 修不了的才丢 */
function sanitizeArchive(x: unknown): Archive | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const b = o.birth;
  if (!b || typeof b !== 'object') return null;
  const bo = b as Record<string, unknown>;
  const y = Number(bo.year), m = Number(bo.month), d = Number(bo.day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return {
    id: String(o.id ?? `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`),
    label: String(o.label ?? '未命名'),
    birth: { ...(bo as unknown as BirthData), year: y, month: m, day: d },
    note: String(o.note ?? ''),
    contact: String(o.contact ?? ''),
    savedAt: Number(o.savedAt) || Date.now(),
    cloud: o.cloud === true ? true : undefined,
  };
}

// supabase-js 未带数据库泛型时 .from() 推断为 never; 此地按行操作放宽 (RLS 才是权限边界)
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = { from: (t: string) => any };
const sbAny = (): AnyClient | null => supabaseBrowser() as unknown as AnyClient | null;

// ---------- 本地 (localStorage) ----------

export function listArchives(): Archive[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(sanitizeArchive).filter((x): x is Archive => x !== null);
  } catch {
    return [];
  }
}

function newId() {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function saveArchive(birth: BirthData, extra?: ArchiveExtra, editId?: string): Archive {
  const cur = editId ? listArchives().find((x) => x.id === editId) : undefined;
  const a: Archive = {
    id: cur?.id ?? newId(),
    label: (birth.label ?? '').trim() || '未命名',
    birth,
    note: (extra?.note ?? cur?.note ?? '').trim(),
    contact: (extra?.contact ?? cur?.contact ?? '').trim(),
    savedAt: Date.now(),
  };
  const l = listArchives().filter((x) => x.id !== a.id);
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

// ---------- 云端 (Supabase; RLS 仅本人可读写) ----------

function rowToArchive(r: Record<string, unknown>): Archive {
  return {
    id: String(r.id),
    label: String(r.label ?? '未命名'),
    birth: r.birth as BirthData,
    note: String(r.note ?? ''),
    contact: String(r.contact ?? ''),
    savedAt: r.created_at ? Date.parse(String(r.created_at)) : Date.now(),
    cloud: true,
  };
}

async function curSession() {
  const sb = supabaseBrowser();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session ?? null;
  } catch {
    return null;
  }
}

/** 双通道读取: 已登录 → 云端; 否则 → 本机 */
export async function loadArchivesSmart(): Promise<{ list: Archive[]; mode: 'cloud' | 'local'; error?: string }> {
  const s = await curSession();
  if (s) {
    const sb = sbAny()!;
    const { data, error } = await sb.from(TABLE).select('id,label,birth,note,contact,created_at').order('created_at', { ascending: false }).limit(300);
    if (!error && data) return { list: (data as Record<string, unknown>[]).map(rowToArchive).map(sanitizeArchive).filter((x): x is Archive => x !== null), mode: 'cloud' };
    return { list: listArchives(), mode: 'local', error: error?.message };
  }
  return { list: listArchives(), mode: 'local' };
}

/** 双通道保存: 已登录 → 云端 (失败回退本机并带回错误); 未登录 → 本机 */
export async function saveArchiveSmart(birth: BirthData, extra?: ArchiveExtra, editId?: string): Promise<{ archive: Archive; mode: 'cloud' | 'local'; error?: string }> {
  const s = await curSession();
  if (s) {
    const sb = sbAny()!;
    const row = {
      label: (birth.label ?? '').trim() || '未命名',
      birth,
      note: (extra?.note ?? '').trim(),
      contact: (extra?.contact ?? '').trim(),
      user_id: s.user.id,
      updated_at: new Date().toISOString(),
    };
    const q = editId
      ? sb.from(TABLE).update(row).eq('id', editId).eq('user_id', s.user.id).select('id,label,birth,note,contact,created_at').single()
      : sb.from(TABLE).insert(row).select('id,label,birth,note,contact,created_at').single();
    const { data, error } = await q;
    if (!error && data) return { archive: rowToArchive(data as Record<string, unknown>), mode: 'cloud' };
    return { archive: saveArchive(birth, extra, editId), mode: 'local', error: error?.message };
  }
  return { archive: saveArchive(birth, extra, editId), mode: 'local' };
}

/** 双通道删除 */
export async function deleteArchiveSmart(id: string): Promise<void> {
  const s = await curSession();
  if (s) {
    const sb = sbAny()!;
    await sb.from(TABLE).delete().eq('id', id).eq('user_id', s.user.id);
    return;
  }
  deleteArchive(id);
}
