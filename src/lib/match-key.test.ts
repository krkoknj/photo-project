import { describe, expect, it } from "vitest";
import { matchKey } from "./match-key";

describe("matchKey", () => {
  it.each([
    ["IMG_1234.JPG", "img_1234"],
    ["img_1234.jpg", "img_1234"],
    ["IMG_1234-edit.jpg", "img_1234"],
    ["IMG_1234_Edited.jpg", "img_1234"],
    ["IMG_1234 retouched.jpeg", "img_1234"],
    ["IMG_1234 (1).jpg", "img_1234"],
    ["IMG_1234-edit (2).jpg", "img_1234"],
    ["IMG_1234_보정.jpg", "img_1234"],
    ["IMG_1234 사본.png", "img_1234"],
    ["DSC01234-final.webp", "dsc01234"],
  ])("%s → %s", (input, expected) => {
    expect(matchKey(input)).toBe(expected);
  });

  it("연사 번호처럼 의미 있는 숫자 접미사는 유지한다", () => {
    expect(matchKey("DSC01234-2.jpg")).toBe("dsc01234-2");
    expect(matchKey("DSC01234-2.jpg")).not.toBe(matchKey("DSC01234.jpg"));
  });

  it("단어 중간의 edit는 지우지 않는다", () => {
    expect(matchKey("credit_photo.jpg")).toBe("credit_photo");
  });

  it("NFD로 저장된 한글 파일명(macOS)도 같은 키가 된다", () => {
    expect(matchKey("사진_01.jpg".normalize("NFD"))).toBe(matchKey("사진_01.jpg"));
  });
});
