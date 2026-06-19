// 감정 아이콘 — DESIGN.md(Apple)의 절제된 톤 위에 감정별 파스텔을 입힌 라인 페이스.
// 연한 파스텔로 얼굴을 채우고(fill), 같은 색 계열의 살짝 진한 선(line)으로 표정을
// 그려 흰 배경·연한 칩 배경에서도 또렷하게 읽힌다. 색은 "감정 데이터"를 나타낼 뿐,
// 인터랙션 색(Action Blue)과 충돌하지 않는다.

import type { EmotionTag } from '@/lib/types';
import { resolveEmotion } from '@/lib/types';

type Props = { tag: EmotionTag | string; className?: string; tone?: 'color' | 'inverse' };

// 감정별 파스텔 팔레트 — fill(연한 면) + line(중간 톤 선/눈).
// 7점 척도: 좋음(+)은 따뜻한 색, 싫음(-)은 차갑거나 경고 톤으로 자연스러운 그라데이션.
// 칩 배경·선택 상태에서도 재사용하도록 export 한다.
export const EMOTION_PALETTE: Record<EmotionTag, { fill: string; line: string }> = {
  moved: { fill: '#FFE9C2', line: '#D98A2B' },     // 감동(+3) — 따뜻한 골드
  satisfied: { fill: '#FFE3D2', line: '#E8895C' }, // 만족(+2) — 복숭아
  calm: { fill: '#D7F2E3', line: '#3FAE80' },      // 편안함(+1) — 민트
  neutral: { fill: '#EAECEF', line: '#9AA0A6' },   // 중립(0) — 소프트 그레이
  worried: { fill: '#FCEBC8', line: '#C79427' },   // 걱정(-1) — 옅은 앰버
  sad: { fill: '#D9E8FB', line: '#5B8FD6' },       // 슬픔(-2) — 파스텔 블루
  fear: { fill: '#E7DEF9', line: '#8B72D0' },      // 공포(-3) — 라벤더
};

// 눈 점(채움) — line 색을 그대로 받도록 currentColor 사용.
function EyeDot({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r="0.9" fill="currentColor" stroke="none" />;
}

const FACES: Record<EmotionTag, React.ReactNode> = {
  // 감동(+3) — 활짝 웃는 눈(^ ^) + 큰 미소
  moved: (
    <>
      <path d="M7.5 10.7 Q9 9.2 10.5 10.7" />
      <path d="M13.5 10.7 Q15 9.2 16.5 10.7" />
      <path d="M7.6 13.4 Q12 17.8 16.4 13.4" />
    </>
  ),
  // 만족(+2) — 또렷한 눈 + 부드러운 미소
  satisfied: (
    <>
      <EyeDot cx={9} cy={10.5} />
      <EyeDot cx={15} cy={10.5} />
      <path d="M8.6 14 Q12 16.4 15.4 14" />
    </>
  ),
  // 편안함(+1) — 감은 눈(아래 호) + 잔잔한 미소
  calm: (
    <>
      <path d="M7.5 10.6 Q9 11.9 10.5 10.6" />
      <path d="M13.5 10.6 Q15 11.9 16.5 10.6" />
      <path d="M9 14.4 Q12 15.8 15 14.4" />
    </>
  ),
  // 중립(0) — 또렷한 눈 + 일자 입
  neutral: (
    <>
      <EyeDot cx={9} cy={10.5} />
      <EyeDot cx={15} cy={10.5} />
      <path d="M9 14.8 H15" />
    </>
  ),
  // 걱정(-1) — 안쪽으로 살짝 올라간 눈썹 + 또렷한 눈 + 살짝 처진 입
  worried: (
    <>
      <path d="M7.8 9.6 Q9.2 9.0 10.4 9.6" />
      <path d="M13.6 9.6 Q14.8 9.0 16.2 9.6" />
      <EyeDot cx={9} cy={11.2} />
      <EyeDot cx={15} cy={11.2} />
      <path d="M9 15.2 Q12 13.9 15 15.2" />
    </>
  ),
  // 슬픔(-2) — 또렷한 눈 + 처진 입 + 눈물 한 방울
  sad: (
    <>
      <EyeDot cx={9} cy={10.6} />
      <EyeDot cx={15} cy={10.6} />
      <path d="M8.6 15.6 Q12 13 15.4 15.6" />
      <path d="M9 12.4 Q9 14 9.9 14 Q9 14 9 12.4 Z" fill="currentColor" stroke="none" />
    </>
  ),
  // 공포(-3) — 치켜뜬 눈썹 + 동그란 눈 + 벌어진 입
  fear: (
    <>
      <path d="M7.6 8.9 Q9 8.1 10.4 8.9" />
      <path d="M13.6 8.9 Q15 8.1 16.4 8.9" />
      <circle cx="9" cy="11.2" r="1.05" />
      <circle cx="15" cy="11.2" r="1.05" />
      <ellipse cx="12" cy="15.4" rx="1.6" ry="2" />
    </>
  ),
};

export default function EmotionIcon({ tag, className, tone = 'color' }: Props) {
  // 레거시 키(즐거움/분노 등)도 새 척도로 해석. 모르는 키면 중립으로 폴백.
  const resolvedTag = (resolveEmotion(tag)?.tag ?? 'neutral') as EmotionTag;
  const { fill, line } = EMOTION_PALETTE[resolvedTag];
  // inverse: 선택되어 솔리드 색 배경 위에 놓일 때 — 흰 선 + 반투명 흰 면.
  const inverse = tone === 'inverse';
  const faceFill = inverse ? 'rgba(255,255,255,0.24)' : fill;
  const lineColor = inverse ? '#ffffff' : line;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // color → currentColor: 표정 선과 눈 점이 line 색을 상속한다.
      style={{ color: lineColor }}
      className={className ?? 'h-4 w-4 shrink-0'}
    >
      <circle cx="12" cy="12" r="9" fill={faceFill} />
      {FACES[resolvedTag]}
    </svg>
  );
}
