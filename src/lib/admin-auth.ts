import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AdminRole = 'owner' | 'admin' | 'operator' | 'support' | 'editor';

const roleRank: Record<AdminRole, number> = {
  editor: 10,
  support: 20,
  operator: 30,
  admin: 40,
  owner: 50,
};

function serverClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(request: Request, minimum: AdminRole = 'support') {
  const sb = serverClient();
  if (!sb) return { ok: false as const, status: 503, error: 'Admin service is not configured' };
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false as const, status: 401, error: 'Missing authorization token' };

  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData.user) return { ok: false as const, status: 401, error: 'Invalid session' };

  const { data: roleRow, error: roleError } = await sb
    .from('user_roles')
    .select('role, disabled')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (roleError) return { ok: false as const, status: 503, error: 'Unable to read admin role' };
  const role = roleRow?.role as AdminRole | undefined;
  if (!role || roleRow?.disabled || roleRank[role] < roleRank[minimum]) {
    return { ok: false as const, status: 403, error: 'Admin permission required' };
  }

  return { ok: true as const, user: userData.user, role, sb };
}
