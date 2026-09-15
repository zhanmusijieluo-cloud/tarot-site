# 账号 + 云端档案 (Supabase Auth + user_archives 双通道)

## 定位 (爸爸已批复的产品方向)
- 一个账号 = 一个档案库; 出生资料录一次, 占星/八字/紫微/塔罗全板块共用.
- 档案字段 = 姓名/生日时间/出生地 + 备注(note) + 联系方式(contact, 仅本人可见).
- 落地件: /login /register (Supabase Auth 邮箱+密码, LoginPanel.tsx 共用, initialMode in|up); Navbar 未登录=登录/注册按钮, 已登录=邮箱前缀 → 点进 /archives; /archives = 「我的档案」页.
- 本项目 Supabase 开了「邮箱确认」: UI 注册返回 user 但 session=null ⇒ 确认邮件已发; 真实用户需去邮箱点链接 (要免确认需爸爸在 Dashboard 关 Confirm email).

## 表结构 (user_archives; 建表 = 爸爸在 Supabase SQL Editor 粘)
直达新查询页: https://supabase.com/dashboard/project/rsmeadcwxwxlhvekusbh/sql/new (console-ops 模板: SQL 以 inline code block 发聊天窗).
```sql
-- 云端档案表: 每个账号保存自己的客户档案, 只有本人可见
create table if not exists public.user_archives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default '未命名',
  birth jsonb not null,
  note text not null default '',
  contact text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_archives enable row level security;
create policy "own_archives_select" on public.user_archives for select to authenticated using (auth.uid() = user_id);
create policy "own_archives_insert" on public.user_archives for insert to authenticated with check (auth.uid() = user_id);
create policy "own_archives_update" on public.user_archives for update to authenticated using (auth.uid() = user_id);
create policy "own_archives_delete" on public.user_archives for delete to authenticated using (auth.uid() = user_id);
create index if not exists ix_user_archives_user on public.user_archives (user_id, created_at desc);
notify pgrst, 'reload schema';
select '柜子建好了' as 结果, count(*) as 里面有几份档案 from public.user_archives;
```
- **sb_secret key 不能通过 PostgREST 建表** (DDL 不走 REST); 本机无 Management PAT → 建表只能爸爸手粘 SQL.
- 新表对 PostgREST 的可见性**不会稳定自动刷新** (实测轮询 6×15s 仍 404 PGRST205) — 发给爸爸的建表 SQL 必须自带 `notify pgrst, 'reload schema';`, 并附一条自检 `select '柜子建好了' as 结果, count(*) as 里面有几份档案 from public.user_archives;` — Results 区出现这张小表格才是他能自己核对的成功凭证、也是聊天窗汇报的 on-screen token.
- 他说'我建立好了'后**先服务端核验再动**: `GET {SUPABASE_URL}/rest/v1/` (带 sb_secret 头) 的 OpenAPI 根返回 `definitions` = 全部表名清单 — 没有 user_archives 就是实际没建成; 别争辩, 直接补发带自检的 SQL 重来 (首轮就发生过: 他说建好但库里仍只有 6 张旧表 — 多半是漏点 Run 或跳到了新建项目页).
- 建表 walkthrough 两个已知坑: ①直达 SQL 链接可能落在 'Create a new project' 页 (组织免费项目已 2/2 到上限, 红字建议 Upgrade) — **绝不点 Upgrade/新建项目**, 让他 Cancel → 左上角组织名下方的小方块图标(项目切换器) → 选 tarot-site-jp → 左侧竖排图标栏第 3 个 `< >` (SQL Editor); ②含 `drop policy` 的 SQL 会弹 'Potential issue detected — destructive operations' — 那是数据库例行二次确认, 让他点橙色 **Run query** (SQL 只做 IF NOT EXISTS 建表 + 同名策略清理, 不碰其他表).

## 双通道实现 (src/lib/astro/archives.ts)
- `Archive {id,label,birth,note,contact,savedAt,cloud?}`; localStorage key `astro-archives-v1` (上限 200 条; 旧档无 note/contact 读时补空串).
- 云端行字段: id uuid / user_id / label / birth jsonb / note / contact / created_at / updated_at.
- API: `loadArchivesSmart()` → {list, mode:'cloud'|'local', error?}; `saveArchiveSmart(birth, extra?, editId?)` → 云端 insert/update 失败**回退本地并带回 error 串**; `deleteArchiveSmart(id)`; 云端操作都带 `.eq('user_id', session.user.id)` 双保险.
- 关键行为: 云端失败**绝不丢数据** — UI 横幅 '云端暂不可用 (可能表还没建): <msg> 档案已暂存本机。' (表未建时 REST = 404 {"code":"PGRST205"}; 该回退路径已真浏览器实测).
- 调用点: /archives 页全部操作; chart 页合盘档案弹层 (列/选/删/新增) **和 `sync=<id>` 查找**都走 smart 层 (云端 id 是 uuid, 只查本地会找不到).
- EditBirth 加了档案模式: props `archive/note0/contact0`, onSave 第二参 `{note, contact}` (向后兼容, 旧调用忽略); 标题变「档案资料」; 备注 maxLength 200 / 联系方式 maxLength 60.

## 本机→云端迁移 + 档案↔排盘入口
- 迁移: /archives 登录态下比对 本机 listArchives() 与云端列表 (label+出生年月日时分) → 差集显示金色横幅 +「一键搬上云」(逐条 saveArchiveSmart). **坑: 入参必须 `{...x.birth, label: x.label}`** — Archive.label 不在 birth 对象里, 直存会让云端 label='未命名' 且下轮比对 (云端'未命名' vs 本机真名) 永不相等、横幅永不消. 实测配方: localStorage 预置一条本机档 → 登录测试号 → 横幅出现 → 点击搬运 → REST 查证 label 正确 + 横幅消失 + 列表出现.
- 档案↔排盘入口: ① /archives 卡「→ 星盘」= `<a href={'/astrology/chart?' + paramsFromBirth({...x.birth, label: x.label})}>`; ② NatalForm 顶部 ArchivePicker「📁 从我的档案选择」onPick **直接组装 BirthData → router.push 出盘, 不回填表单** (爸爸: 数据已确认, 不要停留); ③ 手动「☆ 存入我的档案」按钮已删除, 改为**排完盘自动存档** (爸爸: 有的人会不记得保存): chart 页 useEffect 监听 [data, birth, …] — 仅本命盘视图 (dynType/skyMode/bandKind/syncId/arc 全排除), birth.label 非空, autoStashed.current 指纹 (label+出生时刻) + loadArchivesSmart 查重 → saveArchiveSmart; 无名盘/时刻盘/合盘不存. cornerActions 从此仅剩 编辑资料/宫位设置/排盘设置 三钮 (爸爸: 把这两个资料卡下多余的删掉).

## supabase-js 类型坑 (无 DB 泛型)
- `createClient(url,key)` 不带数据库泛型时 `.from(TABLE).insert(row)` 参数被推断为 **never** (TS2345×2). 本地放宽写法:
  `type AnyClient = { from: (t: string) => any }; const sbAny = (): AnyClient | null => supabaseBrowser() as unknown as AnyClient | null;`
  — 权限边界是 RLS, 不是类型.
- localStorage 读取要防御旧数据形状: `arr.map((x) => ({ ...x, note: x.note ?? '', contact: x.contact ?? '' }))` (写成 `{note:'', ...x}` 会被 TS2783 判'将被覆盖' — 顺序反着写).

## 测试账号全流程 (无真实邮箱时的验证配方)
0. 首选: **Admin API 直接建已确认用户** — `POST {SUPABASE_URL}/auth/v1/admin/users` body `{email, password, email_confirm: true}` (邮箱可取 vc-<stamp>@mailet.com 之类假地址) → 立即可登录, 零邮件发送; 邮箱配额 429 over_email_send_rate_limit 时 UI 注册路全断、此法不受影响. 测毕一律 DELETE 清理 (数据行 + 用户).
1. (备选) UI 注册 (puppeteer): 填 email+密码 → 提交 → 响应 200 + user id (网络监听 /auth/v1/). 无 session ⇒ 等确认 (先查是否 429).
2. 确认测试用户 (绕过邮箱): Auth **Admin API** + `sb_secret_` 密钥:
   - 密钥位置: `scripts/enrich-card-meanings.mjs` 内 `process.env.SUPABASE_SECRET_KEY || 'sb_secret_...'` (唯一磁盘备份, gitignored, 永不删除).
   - `PUT {SUPABASE_URL}/auth/v1/admin/users/{id}` headers {apikey: key, Authorization: 'Bearer '+key} body {"email_confirm": true} → 200 + email_confirmed_at.
   - 清理: `DELETE` 同路径 (status 200).
3. mailinator 公共收件箱 API 首次可用后被 Cloudflare JS 挑战拦 (返回 HTML) — **不要依赖**; 直接走 Admin API.
4. 登录后断言链: /archives 徽标 '已登录 · 云端档案' + 邮箱显示; 表未建时新增档案 → 错误横幅出现 + 列表仍出现该项 (本地回退) — 双重验证. 测毕清 localStorage 测试态与测试用户.
5. 别点错按钮: 导航栏「注册」和登录表单「注册」同文本 — 提交按钮选择器要限定表单内 (如同时含 .w-full); 监听 /auth/v1/ 无任何请求 = 点到了 Navbar 误跳转.
