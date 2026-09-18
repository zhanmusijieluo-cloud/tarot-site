// ============================================================
// 部署切换的自动恢复 (version skew)
//
// 场景 (2026-09-18 实测复现): 用户在 /astrology 表单页停留 → 我们推送新部署 →
//   用户点「排盘」→ 客户端软导航需要加载 chart 路由的**代码分割 chunk** →
//   旧客户端要的那个 chunk 已经不属于当前部署 → ChunkLoadError → 错误边界 → 错误页。
//   实测报错: `ChunkLoadError: Failed to load chunk /_next/static/immutable/chunks/xxx.js`
//
// 这不是代码 BUG, 是部署边界的必然现象。硬刷新一次即可拿到自洽的版本 ——
//   与其让用户盯着错误页, 不如自动恢复一次, 用户完全无感。
// ============================================================

const KEY = 'oracle-chunk-recover-at';
/** 同一窗口内只自动恢复一次: 真故障时第二次就老实显示错误页, 避免无限刷新 */
const WINDOW_MS = 60_000;

/** 判定是否为「部署切换 / 资源拉取失败」类错误 (即刷新就能好的那种) */
export function isStaleAssetError(e: unknown): boolean {
  try {
    const err = e as { name?: string; message?: string } | null;
    const s = `${err?.name || ''} ${err?.message || ''}`;
    return /ChunkLoadError|Failed to load chunk|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|CSS_CHUNK_LOAD_FAILED/i.test(
      s,
    );
  } catch {
    return false;
  }
}

/**
 * 判断是否该自动恢复: 命中且不在冷却窗口内 → 记下时间戳并返回 true。
 *
 * ⚠️ 这里**刻意不自己 reload** —— 早期版本直接 `location.reload()`, 结果是
 *    浏览器重载抢在 React 渲染之前, 用户看到的是**白屏**而不是「正在恢复…」。
 *    正确姿势: 调用方拿到 true → 先 setState 渲染过渡态 → 下一帧再 reload。
 */
export function shouldStaleAssetRecover(e: unknown): boolean {
  if (typeof window === 'undefined') return false;
  if (!isStaleAssetError(e)) return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (last && Date.now() - last < WINDOW_MS) return false; // 刚恢复过还是失败 → 让错误页说话
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false; // 隐私模式等拿不到 sessionStorage → 不冒险自动刷新
  }
  return true;
}

/** 渲染过渡态之后调用: 给浏览器一帧时间把「正在恢复…」画出来, 再硬刷新 */
export function reloadForStaleAsset(delayMs = 450): void {
  if (typeof window === 'undefined') return;
  try {
    window.setTimeout(() => window.location.reload(), delayMs);
  } catch {
    /* 忽略 */
  }
}
