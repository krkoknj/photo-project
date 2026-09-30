// 원본과 보정본을 파일명으로 매칭하기 위한 정규화 키.
// 예) "IMG_1234.JPG", "img_1234-edit.jpg", "IMG_1234 (1).jpg", "IMG_1234_보정.jpg" → "img_1234"

// 보정 도구나 다운로드 과정에서 붙는 접미사 (구분자 포함)
const SUFFIXES = [
  /\s*\(\d+\)$/, // 브라우저 중복 다운로드: " (1)"
  /[\s_-]+(edit(ed)?|retouch(ed)?|final|copy|보정|수정|사본)$/,
];

export function matchKey(filename: string) {
  let key = filename.normalize("NFC").trim().toLowerCase();
  key = key.replace(/\.[a-z0-9]+$/, ""); // 확장자

  // 접미사가 여러 개 겹칠 수 있다: "img_1234-edit (1)"
  let prev;
  do {
    prev = key;
    for (const suffix of SUFFIXES) key = key.replace(suffix, "");
  } while (key !== prev);

  return key || filename.toLowerCase();
}
