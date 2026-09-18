// ============================================================
// 解读历史库: 双通道 — 登录 → 云端 (Supabase reading_sessions, 仅本人可见);
//   未登录 → 本机浏览器 (localStorage, 上限 20 条防爆)
//
// 与 archives.ts 的区别: 档案可编辑 (有 editId), 解读记录只增改不重排,
//   用 upsertSessionSmart(input, existingId) 兼顾「首次保存」与「追问后回写」。
//
// 注意: reading_feedback 表存的是「运营反馈数据」(匿名可写、给后台看),
//   与本库的「用户自己的历史」职责不同, 不要混用。
// ============================================================
import { supabaseBrowser } from '@/lib/supabase';

export type Deck = 'tarot' | 'lenormand';

/** 自定义牌阵格位（与 CustomSpreadBuilder 的 CustomCell 同构） */
export interface LayoutCell {
  row: number;
  col: number;
  cols: number;
  name?: string;
  /** 牌位解读提示：专业师自定的读法要点 */
  hint?: string;
}

/** 归一化后的牌面: 只保留渲染与回看所需的最小字段 */
export interface RecordCard {
  id: number;
  name: string;
  reversed: boolean;
}

export interface RecordChatMessage {
  role: 'user' | 'assistant';
  content: string;
  cards?: RecordCard[];
}

export interface ReadingRecord {
  id: string;
  deck: Deck;
  spreadKey: string | null;
  spreadName: string;
  question: string;
  background: string;
  positions: string[];
  customLayout: LayoutCell[] | null;
  cards: RecordCard[];
  interpretation: string;
  chat: RecordChatMessage[];
  extraCards: RecordCard[];
  lang: string;
  /** 客户维度: 专业师给谁解的, 支持按客户筛选 */
  clientLabel: string;
  rating: 1 | -1 | null;
  /** 摘要: 将来清理全文后保留这一行 + 牌面 */
  summary: string;
  createdAt: number;
  cloud?: boolean;
}

export interface ReadingRecordInput {
  deck: Deck;
  spreadKey?: string | null;
  spreadName?: string;
  question?: string;
  background?: string;
  positions?: string[];
  customLayout?: LayoutCell[] | null;
  cards: RecordCard[];
  interpretation?: string;
  chat?: RecordChatMessage[];
  extraCards?: RecordCard[];
  lang?: string;
  clientLabel?: string;
  rating?: 1 | -1 | null;
  summary?: string;
}

const TABLE = 'reading_sessions';
const KEY = 'tarot-reading-history';
/** 本机保留上限: 解读全文体积大, 本机只留最近 20 条 */
const LOCAL_MAX = 20;

function newId() {
  return `local-session-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- 脏数据兜底 ----------
function sanitizeCard(x: unknown): RecordCard | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const id = Number(o.id);
  const name = String(o.name ?? '').trim();
  if (!Number.isFinite(id) || !name) return null;
  return { id, name, reversed: o.reversed === true || o.isReversed === true };
}

/** 任意值 → 数组（非数组一律当空处理，避免脏数据炸页面） */
function readArray(v: unknown): unknown[] {
  return Array.isArray(v) ? (v as unknown[]) : [];
}

/** 自定义牌阵格位兜底：缺 row/col/cols 的丢弃；全部无效则返回 null */
function sanitizeLayout(x: unknown): LayoutCell[] | null {
  const out: LayoutCell[] = [];
  for (const item of readArray(x)) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const row = Number(c.row);
    const col = Number(c.col);
    const cols = Number(c.cols);
    if (!Number.isFinite(row) || !Number.isFinite(col) || !Number.isFinite(cols)) continue;
    const name = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : undefined;
    const hint = typeof c.hint === 'string' && c.hint.trim() ? c.hint.trim() : undefined;
    out.push({ row, col, cols, name, hint });
  }
  return out.length ? out : null;
}

function sanitizeCards(v: unknown): RecordCard[] {
  const out: RecordCard[] = [];
  for (const item of readArray(v)) {
    const c = sanitizeCard(item);
    if (c) out.push(c);
  }
  return out;
}

function sanitizeRecord(x: unknown): ReadingRecord | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const cards = sanitizeCards(o.cards);
  if (!cards.length) return null;
  const createdAt =
    Number(o.createdAt) || (o.created_at ? Date.parse(String(o.created_at)) : Date.now());
  const ratingRaw = Number(o.rating);
  return {
    id: String(o.id ?? newId()),
    deck: o.deck === 'lenormand' ? 'lenormand' : 'tarot',
    spreadKey: typeof o.spreadKey === 'string' ? o.spreadKey : (typeof o.spread_key === 'string' ? o.spread_key : null),
    spreadName: String(o.spreadName ?? o.spread_name ?? ''),
    question: String(o.question ?? ''),
    background: String(o.background ?? ''),
    positions: readArray(o.positions).map(String),
    customLayout: sanitizeLayout(o.customLayout ?? o.custom_layout),
    cards,
    interpretation: String(o.interpretation ?? ''),
    chat: readArray(o.chat) as RecordChatMessage[],
    extraCards: sanitizeCards(o.extraCards ?? o.extra_cards),
    lang: String(o.lang ?? 'zh'),
    clientLabel: String(o.clientLabel ?? o.client_label ?? ''),
    rating: ratingRaw === 1 ? 1 : ratingRaw === -1 ? -1 : null,
    summary: String(o.summary ?? ''),
    createdAt,
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

export function listSessionsLocal(): ReadingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr
      .map(sanitizeRecord)
      .filter((x): x is ReadingRecord => x !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function writeLocal(list: ReadingRecord[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, LOCAL_MAX)));
  } catch {
    /* 满 / 隐私模式: 静默降级, 不打扰阅读 */
  }
}

function toRow(input: ReadingRecordInput) {
  return {
    deck: input.deck,
    spread_key: input.spreadKey ?? null,
    spread_name: input.spreadName ?? '',
    question: input.question ?? '',
    background: input.background ?? '',
    positions: input.positions ?? [],
    custom_layout: input.customLayout ?? null,
    cards: input.cards,
    interpretation: input.interpretation ?? '',
    chat: input.chat ?? [],
    extra_cards: input.extraCards ?? [],
    lang: input.lang ?? 'zh',
    client_label: input.clientLabel ?? '',
    rating: input.rating ?? null,
    summary: input.summary ?? '',
  };
}

function upsertLocal(input: ReadingRecordInput, existingId?: string): ReadingRecord {
  const list = listSessionsLocal();
  const prev = existingId ? list.find((x) => x.id === existingId) : undefined;
  const record: ReadingRecord = {
    id: prev?.id ?? existingId ?? newId(),
    deck: input.deck,
    spreadKey: input.spreadKey ?? prev?.spreadKey ?? null,
    spreadName: input.spreadName ?? prev?.spreadName ?? '',
    question: input.question ?? prev?.question ?? '',
    background: input.background ?? prev?.background ?? '',
    positions: input.positions ?? prev?.positions ?? [],
    customLayout: input.customLayout ?? prev?.customLayout ?? null,
    cards: input.cards,
    interpretation: input.interpretation ?? prev?.interpretation ?? '',
    chat: input.chat ?? prev?.chat ?? [],
    extraCards: input.extraCards ?? prev?.extraCards ?? [],
    lang: input.lang ?? prev?.lang ?? 'zh',
    clientLabel: input.clientLabel ?? prev?.clientLabel ?? '',
    rating: input.rating ?? prev?.rating ?? null,
    summary: input.summary ?? prev?.summary ?? '',
    createdAt: prev?.createdAt ?? Date.now(),
  };
  writeLocal([record, ...list.filter((x) => x.id !== record.id)]);
  return record;
}

export function deleteSessionLocal(id: string) {
  writeLocal(listSessionsLocal().filter((x) => x.id !== id));
}

// ---------- 云端 (Supabase; RLS 仅本人可读写) ----------

function rowToRecord(r: Record<string, unknown>): ReadingRecord | null {
  return sanitizeRecord({ ...r, cloud: true });
}

/** 双通道读取: 已登录 → 云端; 否则 → 本机 */
export async function loadSessionsSmart(
  limit = 100
): Promise<{ list: ReadingRecord[]; mode: 'cloud' | 'local'; error?: string }> {
  const s = await curSession();
  if (!s) return { list: listSessionsLocal(), mode: 'local' };
  const sb = sbAny()!;
  const { data, error } = await sb
    .from(TABLE)
    .select('id,deck,spread_key,spread_name,question,background,positions,custom_layout,cards,interpretation,chat,extra_cards,lang,client_label,rating,summary,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) {
    return { list: listSessionsLocal(), mode: 'local', error: error?.message };
  }
  const list = (data as Record<string, unknown>[])
    .map(rowToRecord)
    .filter((x): x is ReadingRecord => x !== null);
  return { list, mode: 'cloud' };
}

/**
 * 双通道写入 (幂等):
 *   传 existingId 则更新同一条 (追问后回写 / 重新生成解读);
 *   不传则新建一条。已登录走云端, 失败回退本机并带回错误。
 */
export async function upsertSessionSmart(
  input: ReadingRecordInput,
  existingId?: string
): Promise<{ record: ReadingRecord; mode: 'cloud' | 'local'; error?: string }> {
  const s = await curSession();
  if (s) {
    const sb = sbAny()!;
    const row = { ...toRow(input), user_id: s.user.id, updated_at: new Date().toISOString() };
    const q = existingId
      ? sb.from(TABLE).update(row).eq('id', existingId).eq('user_id', s.user.id).select('id').maybeSingle()
      : sb.from(TABLE).insert(row).select('id').single();
    const { data, error } = await q;
    if (!error && data?.id) {
      const record: ReadingRecord = {
        id: String(data.id),
        deck: input.deck,
        spreadKey: input.spreadKey ?? null,
        spreadName: input.spreadName ?? '',
        question: input.question ?? '',
        background: input.background ?? '',
        positions: input.positions ?? [],
        customLayout: input.customLayout ?? null,
        cards: input.cards,
        interpretation: input.interpretation ?? '',
        chat: input.chat ?? [],
        extraCards: input.extraCards ?? [],
        lang: input.lang ?? 'zh',
        clientLabel: input.clientLabel ?? '',
        rating: input.rating ?? null,
        summary: input.summary ?? '',
        createdAt: Date.now(),
        cloud: true,
      };
      return { record, mode: 'cloud' };
    }
    return { record: upsertLocal(input, existingId), mode: 'local', error: error?.message };
  }
  return { record: upsertLocal(input, existingId), mode: 'local' };
}

/** 双通道删除: 云端按 id, 本机按 id */
export async function deleteSessionSmart(record: ReadingRecord): Promise<void> {
  const s = await curSession();
  if (s && record.cloud) {
    const sb = sbAny()!;
    await sb.from(TABLE).delete().eq('id', record.id).eq('user_id', s.user.id);
    return;
  }
  deleteSessionLocal(record.id);
}

/** 只更新反馈评分 (「准不准」), 不改动其余字段 */
export async function rateSessionSmart(
  target: { id: string; cloud?: boolean },
  rating: 1 | -1
): Promise<void> {
  const s = await curSession();
  if (s && target.cloud) {
    const sb = sbAny()!;
    await sb.from(TABLE).update({ rating }).eq('id', target.id).eq('user_id', s.user.id);
    return;
  }
  const list = listSessionsLocal();
  writeLocal(list.map((x) => (x.id === target.id ? { ...x, rating } : x)));
}

/**
 * 把本机解读历史迁移到云端 (登录后调用)。
 * 本机记录无云端对照键, 以「createdAt 秒级 + 问题」近似判重, 避免重复导入。
 */
export async function migrateSessionsToCloud(): Promise<{ moved: number; error?: string }> {
  const s = await curSession();
  if (!s) return { moved: 0 };
  const local = listSessionsLocal();
  if (!local.length) return { moved: 0 };
  const sb = sbAny()!;
  const { data: cloudRows, error: readErr } = await sb
    .from(TABLE)
    .select('created_at, question')
    .eq('user_id', s.user.id);
  if (readErr) return { moved: 0, error: readErr.message };
  const seen = new Set(
    ((cloudRows ?? []) as { created_at: string; question: string }[]).map(
      (r) => `${Math.floor(Date.parse(r.created_at) / 1000)}|${r.question}`
    )
  );
  const pending = local.filter(
    (x) => !seen.has(`${Math.floor(x.createdAt / 1000)}|${x.question}`)
  );
  if (!pending.length) return { moved: 0 };
  const rows = pending.map((x) => ({
    ...toRow(x),
    user_id: s.user.id,
    created_at: new Date(x.createdAt).toISOString(),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from(TABLE).insert(rows);
  if (error) return { moved: 0, error: error.message };
  return { moved: pending.length };
}

/** 从记录里聚合出客户名列表 (专业师按客户筛选历史用) */
export function collectClients(list: ReadingRecord[]): string[] {
  const set = new Set<string>();
  for (const r of list) if (r.clientLabel.trim()) set.add(r.clientLabel.trim());
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'));
}
