'use client';

// ============================================================
// 重置密码页 (/reset)
// 用户点邮件里的重置链接后落到这里；supabase-js 会自动用 URL 里的
// token 建立临时会话，本页据此让用户设置新密码。
// 无有效会话（链接过期/已被用过）时给出明确指引，而不是白屏。
// ============================================================
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';

const inputCls = 'w-full rounded-xl border border-white/[0.1] bg-black/30 px-3.5 py-2.5 text-[13px] text-frost outline-none transition-colors placeholder:text-muted/45 focus:border-accent/45';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const L = (zh: string, en: string, ja: string) => (lang === 'ja' ? ja : lang === 'en' ? en : zh);

  const [ready, setReady] = useState<null | boolean>(null); // null=检测中
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 等 supabase-js 解析完 URL 里的 token，判断有没有可用的重置会话
  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      const t0 = window.setTimeout(() => setReady(false), 0);
      return () => window.clearTimeout(t0);
    }
    let alive = true;
    const check = async () => {
      const { data } = await sb.auth.getSession();
      if (alive) setReady(!!data.session);
    };
    void check();
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => {
      if (alive && sess) setReady(true);
    });
    // token 解析是异步的，给一小段时间再判定失败
    const t = window.setTimeout(() => { void check(); }, 1200);
    return () => { alive = false; window.clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  const save = async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    if (pw.length < 6) {
      setMsg({ kind: 'err', text: L('密码至少 6 位', 'Password must be at least 6 characters', 'パスワードは6文字以上にしてください') });
      return;
    }
    if (pw !== pw2) {
      setMsg({ kind: 'err', text: L('两次输入的密码不一致', 'The two passwords do not match', 'パスワードが一致しません') });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      setMsg({ kind: 'ok', text: L('密码已更新，正在进入账户中心…', 'Password updated — taking you to your account…', 'パスワードを更新しました。アカウントへ移動します…') });
      window.setTimeout(() => router.push('/account'), 1100);
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  };

  return (
    <PageShell label={L('账号', 'ACCOUNT', 'アカウント')} title={L('设置新密码', 'Set a new password', '新しいパスワード')}>
      <div className="mx-auto w-full max-w-[400px] pb-10 pt-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          {ready === null ? (
            <p className="py-10 text-center text-[12px] text-muted/60">…</p>
          ) : ready === false ? (
            <div className="space-y-3">
              <p className="text-[12.5px] leading-relaxed text-[#e8a08a]">
                {L('这个重置链接无效或已过期。', 'This reset link is invalid or has expired.', 'このリセットリンクは無効か期限切れです。')}
              </p>
              <p className="text-[11.5px] leading-relaxed text-muted/70">
                {L('请回到登录页重新申请一封重置邮件。', 'Go back and request a new reset email.', 'ログイン画面からもう一度リセットメールを申請してください。')}
              </p>
              <button onClick={() => router.push('/login')} className="btn-ghost w-full py-2.5 text-sm">
                {L('返回登录', 'Back to sign in', 'ログインに戻る')}
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <p className="text-[11.5px] leading-relaxed text-muted/70">
                {L('为你的账号设置一个新密码，设置后会直接登录。', 'Choose a new password for your account.', '新しいパスワードを設定してください。')}
              </p>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={L('新密码 (至少 6 位)', 'New password (min 6)', '新しいパスワード（6文字以上）')}
                className={inputCls}
                autoComplete="new-password"
              />
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void save(); }}
                placeholder={L('再输入一次', 'Repeat password', 'もう一度入力')}
                className={inputCls}
                autoComplete="new-password"
              />
              <button onClick={() => void save()} disabled={busy} className="btn-rose w-full py-2.5 text-sm disabled:opacity-50">
                {busy ? '…' : L('保存新密码', 'Save new password', '保存する')}
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
    </PageShell>
  );
}
