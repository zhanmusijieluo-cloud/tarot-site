// ============================================================
// 自定义牌阵库: 双通道 — 登录 → 云端 (Supabase user_spreads, 仅本人可见);
//   未登录 → 本机浏览器 (localStorage)
//
// 兼容性: 本机沿用既有 key「tarot-custom-spreads / lenormand-custom-spreads」,
//   老用户已存的牌阵无需迁移即可继续读取, 结构 { name, cells, savedAt } 保持不变。
// 本机条目 id 用 `local-${deck}-${name}` 稳定推导, 与云端 uuid 在 UI 层统一处理。
// ============================================================
import type { CustomCell } from '@/components/CustomSpreadBuilder';
import { supabaseBrowser } from '@/lib/supabase';

export type Deck = 'tarot' | 'lenormand';

export interface SavedSpread {
  id: string;
  deck: Deck;
  name: string;
  cells: CustomCell[];
  description: string;
  tags: string[];
  useCount: number;
  savedAt: number;
  cloud?: boolean;
}

const TABLE = 'user_spreads';

function lsKey(deck: Deck) {
  return deck === 'lenormand' ? 'lenormand-custom-spreads' : 'tarot-custom-spreads';
}

export function localSpreadId(deck: Deck, name: string) {
  return `local-${deck}-${name}`;
}

// ---------- 脏数据兜底: 缺 row/col/cols 的格位丢弃, 字段尽力修复 ----------
function sanitizeCell(x: unknown): CustomCell | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const row = Number(o.row);
  const col = Number(o.col);
  const cols = Number(o.cols);
  if (!Number.isFinite(row) || !Number.isFinite(col) || !Number.isFinite(cols)) return null;
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : undefined;
  const hint = typeof o.hint === 'string' && o.hint.trim() ? o.hint.trim() : undefined;
  return { row, col, cols, name, hint };
}

function sanitizeSpread(x: unknown, deck: Deck): SavedSpread | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const name = String(o.name ?? '').trim();
  if (!name) return null;
  const rawCells = Array.isArray(o.cells) ? o.cells : [];
  const cells = rawCells.map(sanitizeCell).filter((c): c is CustomCell => c !== null);
  if (!cells.length) return null;
  const tags = Array.isArray(o.tags)
    ? o.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  return {
    id: String(o.id ?? localSpreadId(deck, name)),
    deck,
    name,
    cells,
    description: String(o.description ?? ''),
    tags,
    useCount: Number(o.useCount) || 0,
    savedAt: Number(o.savedAt) || (o.updated_at ? Date.parse(String(o.updated_at)) : Date.now()),
    cloud: o.cloud === true ? true : undefined,
  };
}

// supabase-js 未带数据库泛型时 .from() 推断为 never; 此地按行操作放宽 (RLS 才是权限边界)
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = { from: (t: string) => any };
const sbAny = (): AnyClient | null => supabaseBrowser() as unknown as AnyClient | null;

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

// ---------- 本机 (localStorage) ----------

export function listSpreadsLocal(deck: Deck): SavedSpread[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(lsKey(deck));
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => sanitizeSpread(x, deck))
      .filter((x): x is SavedSpread => x !== null)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function writeLocal(deck: Deck, list: SavedSpread[]) {
  try {
    // 只写回本机字段, 不把 id/cloud 等云端概念写进老结构, 保持与布阵器互通
    const payload = list.map((s) => ({
      name: s.name,
      cells: s.cells,
      savedAt: s.savedAt,
      // 说明为可选字段: 空值不写, 老数据保持原样
      ...(s.description ? { description: s.description } : {}),
    }));
    window.localStorage.setItem(lsKey(deck), JSON.stringify(payload.slice(0, 200)));
  } catch {
    /* 满 / 隐私模式 */
  }
}

/** 本机保存 (同名覆盖, 与布阵器行为一致) */
export function saveSpreadLocal(
  deck: Deck,
  name: string,
  cells: CustomCell[],
  description = ''
): SavedSpread {
  const entry: SavedSpread = {
    id: localSpreadId(deck, name),
    deck,
    name,
    cells,
    description,
    tags: [],
    useCount: 0,
    savedAt: Date.now(),
  };
  const rest = listSpreadsLocal(deck).filter((s) => s.name !== name);
  writeLocal(deck, [entry, ...rest]);
  return entry;
}

export function deleteSpreadLocal(deck: Deck, name: string) {
  writeLocal(deck, listSpreadsLocal(deck).filter((s) => s.name !== name));
}

// ---------- 云端 (Supabase; RLS 仅本人可读写) ----------

function rowToSpread(r: Record<string, unknown>, deck: Deck): SavedSpread | null {
  return sanitizeSpread(
    {
      id: r.id,
      name: r.name,
      cells: r.cells,
      description: r.description,
      tags: r.tags,
      useCount: r.use_count,
      updated_at: r.updated_at,
      cloud: true,
    },
    deck
  );
}

/** 双通道读取: 已登录 → 云端; 否则 → 本机 */
export async function loadSpreadsSmart(
  deck: Deck
): Promise<{ list: SavedSpread[]; mode: 'cloud' | 'local'; error?: string }> {
  const s = await curSession();
  if (!s) return { list: listSpreadsLocal(deck), mode: 'local' };
  const sb = sbAny()!;
  const { data, error } = await sb
    .from(TABLE)
    .select('id,name,cells,description,tags,use_count,updated_at')
    .eq('deck', deck)
    .order('updated_at', { ascending: false })
    .limit(300);
  if (error || !data) {
    return { list: listSpreadsLocal(deck), mode: 'local', error: error?.message };
  }
  const list = (data as Record<string, unknown>[])
    .map((r) => rowToSpread(r, deck))
    .filter((x): x is SavedSpread => x !== null);
  return { list, mode: 'cloud' };
}

/** 双通道保存: 已登录 → 云端 (失败回退本机并带回错误); 未登录 → 本机 */
export async function saveSpreadSmart(
  deck: Deck,
  name: string,
  cells: CustomCell[],
  extra?: { description?: string; tags?: string[] }
): Promise<{ spread: SavedSpread; mode: 'cloud' | 'local'; error?: string }> {
  const s = await curSession();
  if (s) {
    const sb = sbAny()!;
    const row = {
      user_id: s.user.id,
      deck,
      name,
      cells,
      description: extra?.description ?? '',
      tags: extra?.tags ?? [],
      updated_at: new Date().toISOString(),
    };
    // 同名覆盖: 先按 (user_id, deck, name) 查 id, 有则 update, 无则 insert
    const { data: exist } = await sb
      .from(TABLE)
      .select('id')
      .eq('user_id', s.user.id)
      .eq('deck', deck)
      .eq('name', name)
      .maybeSingle();
    const q = exist?.id
      ? sb.from(TABLE).update(row).eq('id', exist.id).eq('user_id', s.user.id)
          .select('id,name,cells,description,tags,use_count,updated_at').single()
      : sb.from(TABLE).insert(row)
          .select('id,name,cells,description,tags,use_count,updated_at').single();
    const { data, error } = await q;
    if (!error && data) {
      const spread = rowToSpread(data as Record<string, unknown>, deck);
      if (spread) return { spread, mode: 'cloud' };
    }
    return { spread: saveSpreadLocal(deck, name, cells, extra?.description ?? ''), mode: 'local', error: error?.message };
  }
  return { spread: saveSpreadLocal(deck, name, cells, extra?.description ?? ''), mode: 'local' };
}

/** 双通道删除: 云端按 id, 本机按 name (本机 id 可反推 name) */
export async function deleteSpreadSmart(spread: SavedSpread): Promise<void> {
  const s = await curSession();
  if (s && spread.cloud) {
    const sb = sbAny()!;
    await sb.from(TABLE).delete().eq('id', spread.id).eq('user_id', s.user.id);
    return;
  }
  deleteSpreadLocal(spread.deck, spread.name);
}

/**
 * 把本机牌阵迁移到云端 (登录后调用)。
 * 同名以云端为准, 只补传云端没有的; 返回实际迁移条数。
 */
export async function migrateSpreadsToCloud(deck: Deck): Promise<{ moved: number; error?: string }> {
  const s = await curSession();
  if (!s) return { moved: 0 };
  const local = listSpreadsLocal(deck);
  if (!local.length) return { moved: 0 };
  const sb = sbAny()!;
  const { data: cloudRows, error: readErr } = await sb
    .from(TABLE)
    .select('name')
    .eq('user_id', s.user.id)
    .eq('deck', deck);
  if (readErr) return { moved: 0, error: readErr.message };
  const cloudNames = new Set(
    ((cloudRows ?? []) as { name: string }[]).map((r) => r.name)
  );
  const pending = local.filter((x) => !cloudNames.has(x.name));
  if (!pending.length) return { moved: 0 };
  const rows = pending.map((x) => ({
    user_id: s.user.id,
    deck,
    name: x.name,
    cells: x.cells,
    description: x.description,
    tags: x.tags,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from(TABLE).insert(rows);
  if (error) return { moved: 0, error: error.message };
  return { moved: pending.length };
}

// ---------- 导入 / 导出 (专业师数据主权) ----------

export interface SpreadExportFile {
  format: 'mustar-spreads';
  version: 1;
  exportedAt: string;
  spreads: { deck: Deck; name: string; cells: CustomCell[]; description?: string; tags?: string[] }[];
}

export function buildSpreadExport(list: SavedSpread[]): string {
  const file: SpreadExportFile = {
    format: 'mustar-spreads',
    version: 1,
    exportedAt: new Date().toISOString(),
    spreads: list.map((s) => ({
      deck: s.deck,
      name: s.name,
      cells: s.cells,
      description: s.description,
      tags: s.tags,
    })),
  };
  return JSON.stringify(file, null, 2);
}

/** 解析导入文件: 宽容处理, 只取能认出的字段; 无法识别的条目跳过 */
export function parseSpreadImport(
  text: string
): { deck: Deck; name: string; cells: CustomCell[]; description?: string }[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  const arr = Array.isArray(o?.spreads) ? o.spreads : Array.isArray(parsed) ? parsed : [];
  const out: { deck: Deck; name: string; cells: CustomCell[]; description?: string }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const it = item as Record<string, unknown>;
    const name = String(it.name ?? '').trim();
    const deck: Deck = it.deck === 'lenormand' ? 'lenormand' : 'tarot';
    const cells = (Array.isArray(it.cells) ? it.cells : [])
      .map(sanitizeCell)
      .filter((c): c is CustomCell => c !== null);
    if (name && cells.length) {
      out.push({ deck, name, cells, description: String(it.description ?? '') });
    }
  }
  return out;
}
