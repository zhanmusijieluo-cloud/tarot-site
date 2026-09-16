import { NextResponse } from 'next/server';
import { getAdminFromRequest, type AdminRole } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await getAdminFromRequest(request, 'support');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const section = url.searchParams.get('section') ?? 'overview';
  if (section === 'overview') {
    const [users, archives, feedback] = await Promise.all([
      auth.sb.from('profiles').select('id', { count: 'exact', head: true }),
      auth.sb.from('user_archives').select('id', { count: 'exact', head: true }),
      auth.sb.from('reading_feedback').select('id', { count: 'exact', head: true }),
    ]);
    return NextResponse.json({
      role: auth.role,
      stats: {
        users: users.count ?? 0,
        archives: archives.count ?? 0,
        feedback: feedback.count ?? 0,
      },
      warnings: [users.error, archives.error, feedback.error].filter(Boolean).map((e) => e?.message),
    });
  }

  if (section === 'users') {
    if (!['admin', 'owner', 'operator', 'support'].includes(auth.role)) {
      return NextResponse.json({ error: 'User management permission required' }, { status: 403 });
    }
    const { data, error } = await auth.sb
      .from('profiles')
      .select('id, email, display_name, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ role: auth.role, users: data ?? [] });
  }

  if (section === 'feedback') {
    const { data, error } = await auth.sb
      .from('reading_feedback')
      .select('id, user_id, deck, vote, note, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ role: auth.role, feedback: data ?? [] });
  }

  return NextResponse.json({ error: 'Unknown admin section' }, { status: 400 });
}

export async function POST(request: Request) {
  const auth = await getAdminFromRequest(request, 'admin' as AdminRole);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ error: 'No write actions are enabled in MVP' }, { status: 501 });
}
