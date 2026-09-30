import { describe, expect, it } from "vitest";
import { extraAmount, extraCount, selectionLimit } from "./selection";

const rules = (base: number, price: number) => ({ base_select_count: base, extra_price_krw: price });

describe("selectionLimit", () => {
  it("추가 가격이 있으면 제한 없음", () => expect(selectionLimit(rules(30, 5000))).toBeNull());
  it("추가 가격이 0이면 기본 장수까지", () => expect(selectionLimit(rules(30, 0))).toBe(30));
  it("둘 다 0이면 제한 없음", () => expect(selectionLimit(rules(0, 0))).toBeNull());
});

describe("extraCount / extraAmount", () => {
  it("기본 장수 이내면 0", () => {
    expect(extraCount(30, rules(30, 5000))).toBe(0);
    expect(extraAmount(12, rules(30, 5000))).toBe(0);
  });
  it("넘긴 만큼 장당 결제", () => {
    expect(extraCount(33, rules(30, 5000))).toBe(3);
    expect(extraAmount(33, rules(30, 5000))).toBe(15000);
  });
  it("기본 0장이면 모두 추가 결제", () => expect(extraAmount(4, rules(0, 3000))).toBe(12000));
  it("가격이 0이면 추가 결제 없음", () => expect(extraCount(50, rules(30, 0))).toBe(0));
});
