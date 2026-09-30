// 셀렉 장수 규칙 (클라이언트·서버 공용)
//
// - 추가 보정 가격이 있으면 기본 장수를 넘겨 고를 수 있고, 넘긴 만큼 장당 결제한다.
// - 가격이 0원이면 기본 장수까지만 고를 수 있다.
// - 기본 장수와 가격이 모두 0이면 작가가 제한을 두지 않은 것으로 보고 무제한 무료.

type Rules = { base_select_count: number; extra_price_krw: number };

/** 고를 수 있는 최대 장수. null이면 제한 없음 */
export function selectionLimit({ base_select_count: base, extra_price_krw: price }: Rules): number | null {
  if (price > 0) return null;
  return base > 0 ? base : null;
}

/** 추가 결제 대상 장수 */
export function extraCount(selected: number, { base_select_count: base, extra_price_krw: price }: Rules) {
  if (price === 0) return 0;
  return Math.max(0, selected - base);
}

export function extraAmount(selected: number, rules: Rules) {
  return extraCount(selected, rules) * rules.extra_price_krw;
}

export const MAX_PINS_PER_PHOTO = 20;
export const MAX_PIN_BODY = 500;
