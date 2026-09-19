-- mustar.vip AI 接口全局限流
-- 在 Supabase SQL Editor 执行一次；只新增一张表和一个函数，不动既有表。
--
-- 为什么要它：src/lib/rate-limit.ts 原先用进程内 Map 计数，Vercel 多实例各算各的，
-- 实际放行量是配置值的若干倍。这张表把计数挪到数据库，一次原子 upsert 完成「窗口重置 + 加一 + 判定」。
--
-- 设计要点：
--   1) 固定窗口，窗口起点随第一次请求滚动；过期即重置为 1。
--   2) 函数 security definer + 表开 RLS 且不放行政策：anon 只能通过函数计数，
--      读不到也改不了别人的桶（否则刷手可以把自己的 count 清零）。
--   3) 键里带 scope 与身份：'interpret:u:<用户id>' 或 'followup:ip:<出口IP>'。

create table if not exists public.ai_rate_bucket (
  key              text   primary key,
  count            int    not null default 1,
  -- 本窗口结束时刻（epoch 毫秒）。用 bigint 而不是 timestamptz，省得在 JS/SQL 两边换算单位。
  window_reset_at  bigint not null
);

alter table public.ai_rate_bucket enable row level security;

-- 兜底：万一有人拿旧版本策略连过这张表，显式收回权限
drop policy if exists "anon 不可读 ai_rate_bucket" on public.ai_rate_bucket;

create or replace function public.ai_take_bucket(p_key text, p_limit integer, p_window_ms integer)
returns table (allowed boolean, retry_after integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  cur_count int;
  cur_reset bigint;
begin
  -- 过期桶顺手清一清（约 1/50 次请求触发一次，避免每次全表扫）
  if random() < 0.02 then
    delete from public.ai_rate_bucket where window_reset_at < now_ms - 86400000;
  end if;

  insert into public.ai_rate_bucket as b (key, count, window_reset_at)
  values (p_key, 1, now_ms + p_window_ms)
  on conflict (key) do update
    set count           = case when b.window_reset_at <= now_ms then 1 else b.count + 1 end,
        window_reset_at = case when b.window_reset_at <= now_ms then now_ms + p_window_ms else b.window_reset_at end
  returning b.count, b.window_reset_at into cur_count, cur_reset;

  allowed   := cur_count <= p_limit;
  retry_after := greatest(0, ceil((cur_reset - now_ms) / 1000.0))::integer;
  remaining := greatest(0, p_limit - cur_count)::integer;
  return next;
end;
$$;

revoke all on function public.ai_take_bucket(text, integer, integer) from public;
grant execute on function public.ai_take_bucket(text, integer, integer) to anon, authenticated;
