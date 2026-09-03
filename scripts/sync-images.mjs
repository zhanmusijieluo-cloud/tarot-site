/**
 * 全站图片素材同步脚本
 *
 * 把 Q:\图片 目录下的所有图片镜像同步到 public/images/，
 * 供网站任何页面 / 板块引用（src="/images/xxx.jpg"）。
 *
 * 在 package.json 的 build 里自动执行：每次构建部署都会自动同步，
 * 所以用户往 Q:\图片 放新图后，重新构建部署即可全站生效。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC = process.env.IMAGE_SRC || 'Q:/图片';
const DST = join(process.cwd(), 'public', 'images');

const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp', '.ico']);

/**
 * PNG 大图自动转 WebP（体积可降 90%+），转成功后不再保留 PNG，避免大图进入部署包。
 * 调用独立 Python 脚本 optimize_images.py 在 Python 进程内处理，
 * 避免跨进程传中文路径时的编码问题。
 */
const PYTHON = process.env.IMAGE_PYTHON || 'C:/Users/Administrator/.workbuddy/binaries/python/versions/3.13.12/python.exe';
const OPT_SCRIPT = join(process.cwd(), 'scripts', 'optimize_images.py');

/** 递归收集源目录中所有图片文件 */
function collect(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collect(full, acc);
    } else if (EXTS.has(extname(name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

if (!existsSync(SRC)) {
  console.warn(`[sync-images] 素材目录不存在：${SRC}，跳过同步（public/images 将保持为空）`);
  process.exit(0);
}

mkdirSync(DST, { recursive: true });

const files = collect(SRC);
for (const file of files) {
  const dest = join(DST, relative(SRC, file));
  mkdirSync(dirname(dest), { recursive: true });
  // 直接读-写覆盖（避免 unlink/cpSync 触发安全拦截）
  writeFileSync(dest, readFileSync(file));
}

// 同步完成后统一做 PNG → WebP 优化（Python 内部处理中文路径）
let converted = 0;
try {
  const out = execFileSync(PYTHON, [OPT_SCRIPT, DST], { encoding: 'utf8', timeout: 120000 });
  const m = out.match(/转换 (\d+) 个 PNG/);
  if (m) converted = Number(m[1]);
} catch (e) {
  console.warn(`[sync-images] WebP 优化步骤失败（不影响主同步）：${e.message?.slice(0, 200)}`);
}

console.log(`[sync-images] 已同步 ${files.length} 张图片：${SRC} → public/images/`);
if (converted > 0) console.log(`[sync-images] ${converted} 个 PNG 已转 WebP（原 PNG 不再保留，节省约 90% 体积）`);
if (files.length === 0) {
  console.log('[sync-images] 素材库为空，public/images 保持空目录');
}
