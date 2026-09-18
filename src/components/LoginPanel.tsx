'use client';

// ============================================================
// 登录 / 注册面板 (Supabase Auth)
// /login 与 /register 共用; 未配置 Supabase 时明确提示
// 含: 注册、登录、忘记密码(发重置邮件)、错误信息三语化、登录后回跳 ?next=
// ============================================================
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';

const inputCls = 'w-full rounded-xl border border-white/[0.1] bg-black/30 px-3.5 py-2.5 text-[13px] text-frost outline-none transition-colors placeholder:text-muted/45 focus:border-accent/45';

/** Supabase 原始报错 → 用户看得懂的话（英文原文对中文用户毫无意义） */
const ERR_MAP: { match: string; zh: string; en: string; ja: string }[] = [
  { match: 'invalid login credentials', zh: '邮箱或密码不正确', en: 'Incorrect email or password', ja: 'メールアドレスまたはパスワードが違います' },
  { match: 'email not confirmed', zh: '邮箱还没验证，请先查收验证邮件', en: 'Email not confirmed — check your inbox', ja: 'メールが未確認です。受信ボックスをご確認ください' },
  { match: 'user already registered', zh: '这个邮箱已经注册过了，直接登录即可', en: 'This email is already registered — just sign in', ja: 'このメールは登録済みです。ログインしてください' },
  { match: 'already been registered', zh: '这个邮箱已经注册过了，直接登录即可', en: 'This email is already registered — just sign in', ja: 'このメールは登録済みです。ログインしてください' },
  { match: 'password should be at least', zh: '密码太短，至少要 6 位', en: 'Password is too short (min 6 characters)', ja: 'パスワードが短すぎます（6文字以上）' },
  { match: 'unable to validate email', zh: '邮箱格式不正确', en: 'That email address looks invalid', ja: 'メールアドレスの形式が正しくありません' },
  { match: 'rate limit', zh: '操作太频繁，请稍等一会儿再试', en: 'Too many attempts — please wait a moment', ja: '操作が多すぎます。しばらくお待ちください' },
  { match: 'too many requests', zh: '操作太频繁，请稍等一会儿再试', en: 'Too many attempts — please wait a moment', ja: '操作が多すぎます。しばらくお待ちください' },
  { match: 'for security purposes', zh: '请求太频繁，请稍后再试', en: 'Please wait a moment before retrying', ja: 'しばらく待ってから再試行してください' },
];

export default function LoginPanel({ initialMode = 'in' }: { initialMode?: 'in' | 'up' }) {
  const { lang } = useI18n();
  const zhMode = lang !== 'en';
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState<string | null | undefined>(undefined); // undefined=加载中
  /** 待验证邮箱：非空时展示「输入验证码」视图 */
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  const [code, setCode] = useState('');
  /** 重发倒计时（秒） */
  const [countdown, setCountdown] = useState(0);

  /** 三语取值 */
  const L = (zh: string, en: string, ja: string) => (lang === 'ja' ? ja : lang === 'en' ? en : zh);

  /** 把 Supabase 英文报错翻成用户看得懂的话 */
  const friendly = (raw: string) => {
    const low = raw.toLowerCase();
    const hit = ERR_MAP.find((e) => low.includes(e.match));
    if (hit) return lang === 'ja' ? hit.ja : lang === 'en' ? hit.en : hit.zh;
    return raw;
  };

  /** 登录后回跳：只接受站内路径，防开放重定向 */
  const nextPath = () => {
    if (typeof window === 'undefined') return '/';
    const raw = new URLSearchParams(window.location.search).get('next') ?? '';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  };

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      const t = window.setTimeout(() => setCur(null), 0);
      return () => window.clearTimeout(t);
    }
    let alive = true;
    sb.auth.getSession().then(({ data }) => { if (alive) setCur(data.session?.user.email ?? null); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => { setCur(sess?.user.email ?? null); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async () => {
    const sb = supabaseBrowser();
    if (!sb) { setMsg({ kind: 'err', text: L('服务未配置 (缺少 .env.local)', 'Supabase not configured', 'サービスが未設定です') }); return; }
    if (!email.includes('@') || pw.length < 6) {
      setMsg({ kind: 'err', text: L('请输入有效邮箱和至少 6 位密码', 'Valid email & password (min 6 chars) required', '有効なメールと6文字以上のパスワードが必要です') });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      if (mode === 'up') {
        const { data, error } = await sb.auth.signUp({ email, password: pw });
        if (error) throw error;
        // 关了「确认邮箱」时 Supabase 直接给 session → 注册即登录
        if (data.session) {
          router.push(nextPath());
        } else {
          // 走验证码流程：原地切到「输入验证码」视图，用户不用离开本页
          setVerifyFor(email);
          setCode('');
          setCountdown(60);
          setMsg(null);
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        router.push(nextPath());
      }
    } catch (e) {
      setMsg({ kind: 'err', text: friendly(e instanceof Error ? e.message : String(e)) });
    } finally { setBusy(false); }
  };

  /** 忘记密码：发重置邮件（邮件里的链接回到 /reset 页设新密码） */
  const sendReset = async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    if (!email.includes('@')) {
      setMsg({ kind: 'err', text: L('请先填写邮箱', 'Enter your email first', '先にメールアドレスを入力してください') });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      });
      if (error) throw error;
      setMsg({ kind: 'ok', text: L('重置链接已发送，请查收邮件（也看一下垃圾箱）', 'Reset link sent — check your inbox (and spam).', 'リセット用リンクを送信しました（迷惑メールもご確認ください）') });
    } catch (e) {
      setMsg({ kind: 'err', text: friendly(e instanceof Error ? e.message : String(e)) });
    } finally { setBusy(false); }
  };

  /** 重发倒计时 */
  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  /** 提交 6 位验证码，通过即登录 */
  const doVerify = async () => {
    const sb = supabaseBrowser();
    if (!sb || !verifyFor) return;
    const token = code.replace(/\D/g, '');
    if (token.length < 6) {
      setMsg({ kind: 'err', text: L('请输入邮件里的 6 位验证码', 'Enter the 6-digit code from your email', 'メールに記載の6桁コードを入力してください') });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const { error } = await sb.auth.verifyOtp({ email: verifyFor, token, type: 'signup' });
      if (error) throw error;
      router.push(nextPath());
    } catch (e) {
      setMsg({ kind: 'err', text: friendly(e instanceof Error ? e.message : String(e)) });
    } finally { setBusy(false); }
  };

  /** 重发验证码（60 秒内不可再发） */
  const resend = async () => {
    const sb = supabaseBrowser();
    if (!sb || !verifyFor || countdown > 0) return;
    setBusy(true); setMsg(null);
    try {
      const { error } = await sb.auth.resend({ type: 'signup', email: verifyFor });
      if (error) throw error;
      setCountdown(60);
      setMsg({ kind: 'ok', text: L('验证码已重新发送', 'Code resent', 'コードを再送しました') });
    } catch (e) {
      setMsg({ kind: 'err', text: friendly(e instanceof Error ? e.message : String(e)) });
    } finally { setBusy(false); }
  };

  const out = async () => { await supabaseBrowser()?.auth.signOut(); setCur(null); setMsg(null); };

  const tabCls = (on: boolean) => `flex-1 rounded-xl border py-2 text-[12.5px] tracking-[0.08em] transition-colors ${on ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`;

  return (
    <div className="mx-auto w-full max-w-[400px] pb-6 pt-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="font-display text-lg tracking-[0.2em] text-accent">{L('账号', 'Account', 'アカウント')}</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">
          {L('登录后档案与牌阵可保存到云端 — 换设备也看得到', 'Sign in to keep archives and spreads in the cloud', 'ログインするとデータがクラウドに保存されます')}
        </p>

        {cur === undefined ? (
          <p className="py-10 text-center text-[12px] text-muted/60">…</p>
        ) : cur ? (
          <div className="mt-5 space-y-3">
            <p className="text-[13px] text-frost/90">
              {L('已登录', 'Signed in', 'ログイン中')}: <span className="text-accent">{cur}</span>
            </p>
            <button onClick={out} className="btn-ghost w-full py-2.5 text-sm">{L('退出登录', 'Sign out', 'ログアウト')}</button>
          </div>
        ) : verifyFor ? (
          /* ── 输入验证码（原地验证，不跳转） ── */
          <div className="mt-5 space-y-3.5">
            <p className="text-[12px] leading-relaxed text-muted/75">
              {L('验证码已发送到 ', 'A 6-digit code was sent to ', '6桁のコードを送信しました：')}
              <span className="text-accent">{verifyFor}</span>
            </p>
            <p className="text-[11px] leading-relaxed text-muted/55">
              {L('请查收邮件（也看一下垃圾箱），把 6 位数字填在下面。', 'Check your inbox (and spam), then enter the code below.', '受信ボックス（迷惑メール含む）をご確認のうえ、下に入力してください。')}
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') void doVerify(); }}
              placeholder={L('6 位验证码', '6-digit code', '6桁のコード')}
              className={`${inputCls} text-center text-[18px] tracking-[0.4em]`}
            />
            <button onClick={() => void doVerify()} disabled={busy} className="btn-rose w-full py-2.5 text-sm disabled:opacity-50">
              {busy ? '…' : L('验证并进入', 'Verify & continue', '確認して進む')}
            </button>
            <div className="flex items-center justify-between text-[11.5px]">
              <button onClick={() => void resend()} disabled={countdown > 0 || busy} className="text-muted/60 transition-colors hover:text-accent disabled:opacity-45">
                {countdown > 0
                  ? L(`${countdown} 秒后可重发`, `Resend in ${countdown}s`, `${countdown}秒後に再送`)
                  : L('重新发送验证码', 'Resend code', 'コードを再送')}
              </button>
              <button onClick={() => { setVerifyFor(null); setCode(''); setMsg(null); }} className="text-muted/60 transition-colors hover:text-accent">
                {L('换个邮箱', 'Use another email', '別のメールを使う')}
              </button>
            </div>
            {msg && (
              <p className={`rounded-xl border px-3 py-2.5 text-[11.5px] leading-relaxed ${msg.kind === 'err' ? 'border-[#e8a08a]/30 text-[#e8a08a]' : 'border-[#84e89e]/30 text-[#84e89e]'}`}>
                {msg.text}
              </p>
            )}
          </div>
        ) : mode === 'forgot' ? (
          /* ── 忘记密码 ── */
          <div className="mt-5 space-y-3.5">
            <p className="text-[12px] leading-relaxed text-muted/75">
              {L('填入注册时用的邮箱，我们会发一封重置密码的邮件给你。', 'Enter your registered email and we will send a reset link.', '登録したメールアドレスにリセット用リンクをお送りします。')}
            </p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void sendReset(); }} placeholder={L('邮箱', 'Email', 'メール')} className={inputCls} autoComplete="email" />
            <button onClick={() => void sendReset()} disabled={busy} className="btn-rose w-full py-2.5 text-sm disabled:opacity-50">
              {busy ? '…' : L('发送重置邮件', 'Send reset link', 'リセットメールを送る')}
            </button>
            {msg && (
              <p className={`rounded-xl border px-3 py-2.5 text-[11.5px] leading-relaxed ${msg.kind === 'err' ? 'border-[#e8a08a]/30 text-[#e8a08a]' : 'border-[#84e89e]/30 text-[#84e89e]'}`}>
                {msg.text}
              </p>
            )}
            <button onClick={() => { setMode('in'); setMsg(null); }} className="w-full text-[11.5px] text-muted/70 transition-colors hover:text-accent">
              ← {L('返回登录', 'Back to sign in', 'ログインに戻る')}
            </button>
          </div>
        ) : (
          /* ── 登录 / 注册 ── */
          <div className="mt-5 space-y-3.5">
            <div className="flex gap-1.5">
              <button onClick={() => { setMode('in'); setMsg(null); }} className={tabCls(mode === 'in')}>{L('登录', 'Sign in', 'ログイン')}</button>
              <button onClick={() => { setMode('up'); setMsg(null); }} className={tabCls(mode === 'up')}>{L('注册', 'Sign up', '新規登録')}</button>
            </div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={L('邮箱', 'Email', 'メール')} className={inputCls} autoComplete="email" />
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} placeholder={L('密码 (至少 6 位)', 'Password (min 6)', 'パスワード（6文字以上）')} className={inputCls} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
            <button onClick={() => void submit()} disabled={busy} className="btn-rose w-full py-2.5 text-sm disabled:opacity-50">
              {busy ? '…' : mode === 'up' ? L('注册', 'Sign up', '新規登録') : L('登录', 'Sign in', 'ログイン')}
            </button>
            {mode === 'in' && (
              <button onClick={() => { setMode('forgot'); setMsg(null); }} className="w-full text-[11.5px] text-muted/60 transition-colors hover:text-accent">
                {L('忘记密码？', 'Forgot password?', 'パスワードをお忘れですか？')}
              </button>
            )}
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
