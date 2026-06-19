import { createClient, isSupabaseConfigured } from './supabase/server';

// 서버 컴포넌트/라우트 핸들러용 — 현재 로그인 사용자
export async function getSessionUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// 서버 전용 — 현재 사용자가 admin인지
export async function isAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (adminEmail && user.email?.toLowerCase() === adminEmail) return true;

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    return data?.role === 'admin';
  } catch {
    return false;
  }
}
