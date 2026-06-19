# 므네모 (Mnemo) — MVP

> 떠올리기 어려운 단어를 사용자가 직접 기록 → LLM이 같은 카테고리의 동급 유사어 10개 생성 →
> 각 항목을 "알고 있음 / 모르는 편"으로 분류 저장 → 회상 훈련(선택형/빈칸형) → 가중치 기반 개인화.

## 기술

- Next.js 15 + React 19 (App Router) + TypeScript + Tailwind
- 저장: **로컬(localStorage) + Supabase Postgres** (write-through 동기화)
- 인증: **Supabase Auth** (이메일 + 비밀번호)
- LLM: Anthropic SDK (서버 라우트 `/api/related-words`)
- 모바일/데스크톱 웹 모두 동작 (Android 앱은 Capacitor로 같은 빌드 감싸 배포 가능)

## 빠른 시작 (로컬)

```bash
cd app
npm install
cp .env.local.example .env.local
# .env.local 채우기 — 아래 "Supabase 셋업" 참고
npm run dev
# → http://localhost:3001
```

API 키/Supabase 키 미설정 시:
- LLM 키 없음 → `/api/related-words`가 503, "키 설정 필요" 메시지
- Supabase 키 없음 → 로그인 메뉴는 보이지만 작동 안 함, 기존처럼 게스트(localStorage) 동작

## Supabase 셋업 (5분)

### 1) 프로젝트 생성
1. https://supabase.com/dashboard → New project
2. Region: `Northeast Asia (Seoul)` 추천
3. DB password 적당히 설정하고 저장

### 2) DB 스키마 적용
1. 좌측 메뉴 → **SQL Editor** → New query
2. `app/supabase/migrations/001_initial_schema.sql` 내용 통째로 붙여넣고 **Run**
3. 좌측 메뉴 → **Authentication > Providers > Email**에서:
   - "Confirm email" 꺼두면 가입 즉시 로그인 가능 (개발 편의)
   - 운영에서는 켜놓고 메일 발송 설정

### 3) 키 복사 → `.env.local`
좌측 메뉴 → **Project Settings > API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon public)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role, 절대 클라이언트에 노출 금지)
ADMIN_EMAIL=planb4u@planb4u.kr
```

### 4) 관리자 계정 만들기
1. 로컬 앱 띄우고 `/signup`에서 `planb4u@planb4u.kr`로 가입
2. (선택) Supabase SQL Editor에서 명시적으로:
   ```sql
   update public.profiles set role = 'admin' where email = 'planb4u@planb4u.kr';
   ```
   *코드(`ADMIN_EMAIL`)로도 자동 admin 처리되지만, DB에도 박아두면 다른 환경에서 헷갈리지 않음.*
3. `/admin`으로 접속 가능 (사이드바 상단에 "관리자" 배지가 보임)

## 화면

| 경로 | 화면 | 핵심 기능 |
|---|---|---|
| `/` | 대시보드 | 기록한 단어/감정 요약, 최근 훈련 결과 |
| `/record` | 단어 기록 | 단어, 감정 5종, 강도 0~3, 맥락 메모, known/unknown |
| `/mindmap/[wordId]` | 마인드맵 | LLM이 동급 유사어 10개 생성 → 각 항목 known/unknown/skip → 일괄 저장 |
| `/train` | 회상 훈련 | 5문항. 같은 묶음 형제 3+이면 선택형, 아니면 빈칸형 |
| `/result?sid=...` | 결과 | 정답률, 문항별 시간 |
| `/login` `/signup` | 인증 | 이메일 + 비밀번호 |
| `/admin` | 관리자 대시보드 | 전체 통계, 감정 분포 |
| `/admin/users` | 관리자 — 사용자 | 전체 사용자 목록 + 단어 수 |
| `/admin/users/[id]` | 관리자 — 사용자 상세 | 단어/세션/정답률 |
| `/admin/vocab` | 관리자 — 전체 단어 | 검색 + 페이지네이션 |

## 동작 방식 — 저장 / 동기화

- **로그인 안 함 (게스트)**: 기존처럼 `localStorage`만 사용. 서버 호출 0.
- **로그인 함**: `storage.ts`의 모든 쓰기가 즉시 `localStorage`에 반영 후, fire-and-forget으로
  Supabase `vocabulary_items` / `training_sessions`에도 upsert.
- **첫 로그인**: `pushLocalToServer()`가 자동 호출되어
  1) localStorage의 모든 항목을 서버로 push,
  2) 서버에 있는 다른 기기 데이터까지 pull해서 localStorage에 머지.

기존 페이지 코드(`/record`, `/train` 등)는 한 줄도 안 바꿈 — 동기 `storage.ts` 인터페이스가 그대로라서 그렇다.

## 데이터 모델 (요지)

`src/lib/types.ts`

- `VocabularyItem` — wordText, emotionTags(EmotionTag[]), emotionIntensity, contextNote?, status('known'|'unknown'), source('user_input'|'llm_suggested'), parentItemId?, difficultyScore, attempts, successes
- `RelatedWord` — { word, type:'same_category_peer', reason }
- `TrainingSession` / `TrainingAnswer`

DB 테이블:
- `profiles(id, email, role)` — auth.users 1:1
- `vocabulary_items(...)` — RLS: 본인 데이터만, admin은 전체
- `training_sessions(id, user_id, answers jsonb, ...)`

저장 키 (localStorage):
- `wk.vocab.v1` — VocabularyItem[]
- `wk.sessions.v1` — TrainingSession[] (최대 50)

## Vercel 배포 (10분)

### 1) GitHub에 push
```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2) Vercel에서 import
1. https://vercel.com/new
2. GitHub repo 선택
3. **Framework**: Next.js (자동 감지)
4. **Root Directory**: `app`
5. **Environment Variables**에 `.env.local`의 모든 키를 그대로 입력
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
6. **Deploy**

### 3) Supabase에서 Redirect URL 등록
- Supabase 대시보드 → **Authentication > URL Configuration**
- **Site URL**: `https://<your-vercel-domain>`
- **Redirect URLs**:
  - `https://<your-vercel-domain>/auth/callback`
  - 개발용으로 `http://localhost:3001/auth/callback`도 추가

### 4) 끝. 첫 가입 = 자동 관리자
`ADMIN_EMAIL`로 가입하면 사이드바에 "관리자" 배지가 뜨고 `/admin`이 열린다.

## 가중치(개인화)

`src/lib/training.ts`
- 정답: difficultyScore -0.5 (최저 0.5)
- 오답: difficultyScore +0.8 (최대 5.0)
- 출제 시 difficultyScore에 비례한 가중 추첨

## LLM 동급 유사어 10개 보장 규칙

`src/lib/llm.ts`
- system prompt: 동의어 X, **같은 카테고리의 동등 위치** 10개, JSON 외 출력 금지
- 후처리: targetWord 자기 자신 제거, 중복 제거, 30자 초과 제거, 정확히 10개 컷
- 10개 미만이면 1회 재시도

## 다음 마일스톤

- [ ] IndexedDB로 이전 (이미지/대용량 메모 대비)
- [ ] PWA + Capacitor Android 패키징
- [ ] 망각 곡선(24h/7d) 자동 비교 & 알림
- [ ] LLM 응답 캐시 (동일 단어 중복 호출 방지)
- [ ] 가족/임상 공유용 익명 ID 동기화 (선택)
