'use client';

// ============================================================
// 我的档案 (账号体系) — 爸爸: 档案库 = 登录后管理客户出生资料
// 出生资料录一次, 占星/八字/紫微/塔罗全板块共用
// 双通道: 登录 → 云端 (换设备同步); 未登录 → 本机浏览器
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import EditBirth from '@/components/astro/EditBirth';
import { loadArchivesSmart, saveArchiveSmart, deleteArchiveSmart, type Archive } from '@/lib/astro/archives';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import type { BirthData } from '@/lib/astro/chart';

const EMPTY: BirthData = { year: 1995, month: 1, day: 1, hour: 12, minute: 0, timezone: 8, latitude: 39.9, longitude: 116.41, city: '北京', timeKnown: true, houseSystem: 'placidus' };
const pad = (x: number) => String(x).padStart(2, '0');

export default function ArchivesPage() {
  const { lang } = useI18n();
  const zhMode = lang !== 'en';
  const [list, setList] = useState<Archive[]>([]);
  const [mode, setMode] = useState<'cloud' | 'local'>('local');
  const [cloudErr, setCloudErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [mail, setMail] = useState<string | null | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Archive | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const r = await loadArchivesSmart();
    setList(r.list);
    setMode(r.mode);
    setCloudErr(r.error ?? '');
    setLoading(false);
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) { setMail(null); refresh(); return; }
    let alive = true;
    sb.auth.getSession().then(({ data }) => { if (alive) setMail(data.session?.user.email ?? null); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => {
      setMail(sess?.user.email ?? null);
      refresh();
    });
    refresh();
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [refresh]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: Archive) => { setEditing(a); setFormOpen(true); };

  const onSave = async (b: BirthData, ex?: { note: string; contact: string }) => {
    setSaving(true);
    const r = await saveArchiveSmart(b, ex, editing?.id);
    setSaving(false);
    setFormOpen(false);
    if (r.mode === 'local' && r.error) setCloudErr(r.error);
    refresh();
  };

  const del = async (id: string) => {
    await deleteArchiveSmart(id);
    refresh();
  };

  return (
    <PageShell label="ACCOUNT" title={zhMode ? '我的档案' : 'My archives'}>
      <div className="mx-auto w-full max-w-3xl pb-10">
        {/* 状态条 */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
          {mail === undefined ? (
            <p className="text-[12px] text-muted/60">…</p>
          ) : mail ? (
            <>
              <span className="rounded-full border border-[#84e89e]/35 bg-[#84e89e]/[0.06] px-2.5 py-0.5 text-[10.5px] text-[#84e89e]">{zhMode ? '已登录 · 云端档案' : 'Signed in · cloud'}</span>
              <span className="text-[12px] text-frost/80">{mail}</span>
              <button onClick={() => supabaseBrowser()?.auth.signOut()} className="ml-auto text-[11px] text-muted/60 transition-colors hover:text-[#e8a08a]">{zhMode ? '退出登录' : 'Sign out'}</button>
            </>
          ) : (
            <>
              <span className="rounded-full border border-white/[0.14] px-2.5 py-0.5 text-[10.5px] text-muted">{zhMode ? '未登录 · 仅存本机' : 'Local only'}</span>
              <span className="text-[11.5px] text-muted/70">{zhMode ? '登录后档案存到云端, 换电脑也看得到' : 'Sign in to sync across devices'}</span>
              <a href="/login" className="ml-auto rounded-full border border-accent/40 px-3.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent/[0.08]">{zhMode ? '去登录' : 'Sign in'}</a>
            </>
          )}
        </div>

        {cloudErr && (
          <p className="mb-4 rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2.5 text-[11.5px] leading-relaxed text-[#e8a08a]">
            {zhMode ? '云端暂不可用 (可能表还没建): ' : 'Cloud unavailable: '}{cloudErr}
            {' '}{zhMode ? '档案已暂存本机。' : 'Saved locally.'}
          </p>
        )}

        {/* 工具栏 */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11.5px] text-muted/70">
            {zhMode ? `共 ${list.length} 份档案 — 出生资料录一次, 占星/八字/紫微共用` : `${list.length} archives`}
          </p>
          <button onClick={openNew} className="btn-rose btn-rose--sm">{zhMode ? '+ 新增档案' : '+ New archive'}</button>
        </div>

        {/* 列表 */}
        {loading ? (
          <p className="py-14 text-center text-[12px] tracking-[0.3em] text-muted/60">…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] px-6 py-14 text-center">
            <p className="text-[13px] text-muted/80">{zhMode ? '还没有档案' : 'No archives yet'}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/55">
              {zhMode ? '点右上「新增档案」把客户的生日录进来 — 以后占星排盘、合盘、八字、紫微都用它' : 'Add a client birth profile to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((x) => (
              <div key={x.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/[0.16]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p className="text-[14px] text-frost">{x.label}</p>
                  <p className="text-[11.5px] text-muted/75">
                    {x.birth.year}-{pad(x.birth.month)}-{pad(x.birth.day)} {pad(x.birth.hour)}:{pad(x.birth.minute)}
                    {x.birth.timeKnown === false ? (zhMode ? ' (时辰未知)' : ' (time unk.)') : ''} · {x.birth.city ?? ''}
                  </p>
                  {x.cloud ? (
                    <span className="rounded-full border border-[#84e89e]/30 px-2 py-0.5 text-[9.5px] text-[#84e89e]/80">{zhMode ? '云端' : 'Cloud'}</span>
                  ) : (
                    mail ? null : <span className="rounded-full border border-white/[0.12] px-2 py-0.5 text-[9.5px] text-muted/60">{zhMode ? '本机' : 'Local'}</span>
                  )}
                  <span className="ml-auto flex items-center gap-3">
                    <button onClick={() => openEdit(x)} className="text-[11px] text-muted/70 transition-colors hover:text-accent">{zhMode ? '编辑' : 'Edit'}</button>
                    <button onClick={() => del(x.id)} className="text-[11px] text-muted/50 transition-colors hover:text-[#e8a08a]">{zhMode ? '删除' : 'Del'}</button>
                  </span>
                </div>
                {(x.note || x.contact) && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted/60">
                    {x.note}
                    {x.note && x.contact ? ' · ' : ''}
                    {x.contact}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 text-[10.5px] leading-relaxed text-muted/45">
          {zhMode
            ? '隐私说明: 登录后档案存在云端「只有您本人可读」的柜子里 (上锁规则在数据库层), 其他用户看不到您的档案。'
            : 'Privacy: cloud archives are readable only by you (row-level security).'}
        </p>
      </div>

      <EditBirth
        birth={editing?.birth ?? EMPTY}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={onSave}
        archive
        note0={editing?.note ?? ''}
        contact0={editing?.contact ?? ''}
      />
      {saving && <p className="sr-only">saving</p>}
    </PageShell>
  );
}
