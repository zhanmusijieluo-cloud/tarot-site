'use client';

// ============================================================
// 登录 / 注册面板 (Supabase Auth) — 后端账号系统第一步
// 爸爸: 每个账号保存自己的客户档案 (云端, 多设备同步)
// /login 与 /register 共用; 未配置 Supabase 时明确提示
// ============================================================
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';

const inputCls = 'w-full rounded-xl border border-white/[0.1] bg-black/30 px-3.5 py-2.5 text-[13px] text-frost outline-none transition-colors placeholder:text-muted/45 focus:border-accent/45';

export default function LoginPanel({ initialMode = 'in' }: { initialMode?: 'in' | 'up' }) {
  const { lang } = useI18n();
  const zhMode = lang !== 'en';
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>(initialMode);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState<string | null | undefined>(undefined); // undefined=加载中

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) { setCur(null); return; }
    let alive = true;
    sb.auth.getSession().then(({ data }) => { if (alive) setCur(data.session?.user.email ?? null); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => { setCur(sess?.user.email ?? null); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async () => {
    const sb = supabaseBrowser();
    if (!sb) { setMsg({ kind: 'err', text: zhMode ? '服务未配置 (缺少 .env.local)' : 'Supabase not configured' }); return; }
    if (!email.includes('@') || pw.length < 6) { setMsg({ kind: 'err', text: zhMode ? '请输入有效邮箱和至少 6 位密码' : 'Valid email & password (min 6 chars) required' }); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === 'up') {
        const { data, error } = await sb.auth.signUp({ email, password: pw });
        if (error) throw error;
        if (data.session) {
          setMsg({ kind: 'ok', text: zhMode ? '注册成功, 已自动登录 ✓' : 'Signed up & signed in ✓' });
          setTimeout(() => router.push('/'), 900);
        } else {
          setMsg({ kind: 'ok', text: zhMode ? '注册成功! 需要先去邮箱点确认链接, 再回来登录' : 'Check your email to confirm, then sign in.' });
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        setMsg({ kind: 'ok', text: zhMode ? '登录成功 ✓' : 'Signed in ✓' });
        setTimeout(() => router.push('/'), 700);
      }
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  };

  const out = async () => { await supabaseBrowser()?.auth.signOut(); setCur(null); setMsg(null); };

  const tabCls = (on: boolean) => `flex-1 rounded-xl border py-2 text-[12.5px] tracking-[0.08em] transition-colors ${on ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`;

  return (
    <div className="mx-auto w-full max-w-[400px] pb-6 pt-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="font-display text-lg tracking-[0.2em] text-accent">{zhMode ? '账号' : 'Account'}</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">
          {zhMode ? '登录后合盘档案可保存到云端 — 换设备也看得到' : 'Sign in to keep synastry archives in the cloud'}
        </p>

        {cur === undefined ? (
          <p className="py-10 text-center text-[12px] text-muted/60">…</p>
        ) : cur ? (
          <div className="mt-5 space-y-3">
            <p className="text-[13px] text-frost/90">
              {zhMode ? '已登录' : 'Signed in'}: <span className="text-accent">{cur}</span>
            </p>
            <button onClick={out} className="btn-ghost w-full py-2.5 text-sm">{zhMode ? '退出登录' : 'Sign out'}</button>
          </div>
        ) : (
          <div className="mt-5 space-y-3.5">
            <div className="flex gap-1.5">
              <button onClick={() => { setMode('in'); setMsg(null); }} className={tabCls(mode === 'in')}>{zhMode ? '登录' : 'Sign in'}</button>
              <button onClick={() => { setMode('up'); setMsg(null); }} className={tabCls(mode === 'up')}>{zhMode ? '注册' : 'Sign up'}</button>
            </div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={zhMode ? '邮箱' : 'Email'} className={inputCls} autoComplete="email" />
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder={zhMode ? '密码 (至少 6 位)' : 'Password (min 6)'} className={inputCls} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
            <button onClick={submit} disabled={busy} className="btn-rose w-full py-2.5 text-sm disabled:opacity-50">
              {busy ? '…' : mode === 'up' ? (zhMode ? '注册' : 'Sign up') : (zhMode ? '登录' : 'Sign in')}
            </button>
            {msg && (
              <p className={`rounded-xl border px-3 py-2.5 text-[11.5px] leading-relaxed ${msg.kind === 'err' ? 'border-[#e8a08a]/30 text-[#e8a08a]' : 'border-[#84e89e]/30 text-[#84e89e]'}`}>
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
