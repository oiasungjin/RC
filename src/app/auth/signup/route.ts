import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { passwordIssues } from '@/lib/password';

// 토큰/대시보드 토글 없이 이메일 인증번호 가입을 구현하는 서버 라우트.
//  1) 서버에서 비밀번호 정책 검증 후, 비밀번호와 함께 "미확인" 사용자 생성(admin)
//  2) 그 이메일로 인증번호(OTP) 발송(signInWithOtp). 사용자는 다음 단계에서 번호를 입력해 확인한다.
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase가 설정되지 않았습니다.' }, { status: 400 });
  }

  let body: {
    email?: string;
    password?: string;
    gender?: string;
    birthYear?: number | string;
    occupation?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const gender = ['male', 'female', 'unspecified'].includes(body.gender ?? '')
    ? body.gender
    : undefined;
  // 생년(1900~2030 정수)·직업(허용 코드)만 통과. 트리거가 동일 규칙으로 한 번 더 검증한다.
  const by = Number(body.birthYear);
  const birthYear =
    Number.isInteger(by) && by >= 1900 && by <= 2030 ? String(by) : undefined;
  const occupation = [
    'professional', 'office', 'technical', 'service', 'selfemployed',
    'agriculture', 'homemaker', 'student', 'retired', 'other', 'unspecified',
  ].includes(body.occupation ?? '')
    ? body.occupation
    : undefined;

  if (!email) {
    return NextResponse.json({ error: '이메일을 입력하세요.' }, { status: 400 });
  }
  const issues = passwordIssues(password);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: `비밀번호 조건을 충족해야 합니다: ${issues.join(', ')}` },
      { status: 400 }
    );
  }

  // 1) 비밀번호와 함께 미확인 사용자 생성. (handle_new_user 트리거가 gender 를 profiles 로 옮긴다.)
  const admin = createAdminClient();
  const metadata: Record<string, string> = {};
  if (gender) metadata.gender = gender;
  if (birthYear) metadata.birth_year = birthYear;
  if (occupation) metadata.occupation = occupation;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: metadata,
  });

  let alreadyExists = false;
  if (cErr) {
    const msg = cErr.message ?? '';
    if (/already|registered|exists/i.test(msg)) {
      // 미확인 상태로 중단했다 다시 시도하는 경우 등 — 인증번호만 다시 보내 진행한다.
      alreadyExists = true;
    } else {
      return NextResponse.json({ error: msg || '가입에 실패했습니다.' }, { status: 400 });
    }
  }

  // 2) 인증번호(OTP) 발송. (Magic Link/OTP 이메일 템플릿 사용)
  const supabase = await createClient();
  const { error: oErr } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (oErr) {
    // 방금 만든 미확인 사용자가 고아로 남지 않도록 정리(이미 존재하던 계정은 건드리지 않음).
    if (!alreadyExists && created?.user?.id) {
      await admin.auth.admin.deleteUser(created.user.id);
    }
    return NextResponse.json(
      { error: '인증번호 발송에 실패했습니다: ' + oErr.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ otpSent: true });
}
