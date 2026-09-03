'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 全站返回按钮 —— 左上角细箭头〈
 * - 首页不显示；固定在导航栏下方内容区顶部左侧，与 logo 错行显示。
 * - 点击返回上一步（router.back）；仅当本页是「直接打开的内页」
 *   （sessionStorage 中没有站内上一页）时才回首页兜底。
 *
 * 实现说明：旧版依赖 document.referrer 判断，但 SPA 内部跳转不会更新 referrer，
 * 导致「先进入站点再点进子页」的场景被误判为无历史而直接回首页。
 * 现改为在 sessionStorage 中维护站内路径栈：
 *   栈长度 >= 2 说明存在站内上一页 → back()；
 *   否则视为外部直达/新开标签 → push('/')。
 */
const STACK_KEY = 'app-nav-stack';

function readStack(): string[] {
  try {
    const raw = window.sessionStorage.getItem(STACK_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    // 防止异常场景下无限增长
    if (stack.length > 50) stack.splice(0, stack.length - 50);
    window.sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
  } catch { /* ignore */ }
}

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  // 维护站内路径栈：前进入栈 / 浏览器后退出栈，保证「能否 back」判断准确
  useEffect(() => {
    const stack = readStack();
    if (stack[stack.length - 1] === pathname) return;
    if (stack.length >= 2 && stack[stack.length - 2] === pathname) {
      // 浏览器原生后退：当前页已在栈顶，弹出即可
      stack.pop();
    } else {
      stack.push(pathname);
    }
    writeStack(stack);
  }, [pathname]);

  // 页面加载后短暂延迟淡入，避免首屏闪现
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (pathname === '/') return null;

  const goBack = () => {
    // 栈里除当前页外还有页面 → 存在站内上一页，真正返回上一步
    if (readStack().length >= 2) {
      const stack = readStack();
      stack.pop();
      writeStack(stack);
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Back"
      className={`fixed left-3 top-[5.25rem] z-[90] flex h-10 w-10 items-center justify-center rounded-full text-frost/60 transition-all duration-500 hover:bg-white/[0.06] hover:text-frost active:scale-90 sm:left-4 sm:top-[5.75rem] ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
    >
      {/* 细线大箭头〈 */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M15 4l-8 8 8 8" />
      </svg>
    </button>
  );
}
