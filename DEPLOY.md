# 배포 가이드 (Vercel + Supabase)

무료(Hobby) 티어로 100명 베타 테스트 기준. 이 저장소(`app/`)가 Next.js 프로젝트 루트입니다.

## 1. GitHub에 올리기
```bash
# app/ 에서 (이미 git init·최초 커밋 완료된 상태)
git remote add origin https://github.com/<계정>/<repo>.git
git push -u origin main
```
> GitHub에 빈 repo를 먼저 만든 뒤 URL을 연결하세요.

## 2. Vercel 연결
1. vercel.com → New Project → 위 GitHub repo import
2. **Root Directory**: 이 repo가 곧 `app/`이면 그대로 두면 됨.
   (만약 상위 폴더째 올렸다면 Root Directory를 `app`으로 지정)
3. Framework: Next.js (자동 감지)
4. Build/Output: 기본값 그대로

## 3. 환경변수 등록 (Vercel → Settings → Environment Variables)
`.env.local.example` 참고. **값은 Vercel 대시보드에만** 넣고 코드에 커밋 금지.

| 키 | 용도 | 필수 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 익명 키 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용(관리자 기능) | ✅ |
| `ADMIN_EMAIL` | 관리자 자동 부여 이메일 | ✅ |
| `ANTHROPIC_API_KEY` | 사전 밖 단어 LLM 생성 | ⛔ 비워두면 데모. **넣기 전 개인정보 동의 체계 먼저**(docs/regulatory 참고) |
| `ANTHROPIC_MODEL` | (선택) 모델 지정 | — |

## 4. Supabase 설정 (배포 도메인 확보 후)
Supabase → Authentication → URL Configuration
- **Site URL**: `https://<프로젝트>.vercel.app`
- **Redirect URLs**: 위 도메인 추가 (없으면 로그인/이메일 인증 콜백 실패)
- RLS(행 수준 보안)가 모든 테이블에 켜져 있는지 점검

## 5. 배포 후 점검
- [ ] `https://<도메인>/` 정상 로드
- [ ] 로그인/회원가입 동작 (Supabase Redirect URL 반영됐는지)
- [ ] `https://<도메인>/manifest.webmanifest` 200
- [ ] `https://<도메인>/.well-known/assetlinks.json` 200 (TWA용)
- [ ] 단어 기록 → 마인드맵 10개 생성 확인

## 6. (선택) 한국 사용자 지연 최소화
Vercel → Settings → Functions → Region을 **Seoul (icn1)** 로 지정.

## 7. 다음 단계: TWA 포장
배포 도메인이 생기면 `public/.well-known/README.md` 절차대로 진행.

---
참고: Vercel Hobby는 비상업용 약관. **결제/수익이 생기면 Pro로 전환** 필요.
