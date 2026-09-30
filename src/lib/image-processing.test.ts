import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderPreviews } from "./image-processing";

function jpeg(width: number, height: number, orientation?: number) {
  const img = sharp({ create: { width, height, channels: 3, background: { r: 40, g: 120, b: 200 } } }).jpeg();
  return (orientation ? img.withMetadata({ orientation }) : img).toBuffer();
}

describe("renderPreviews", () => {
  it("긴 변 2000px 이하 WebP 미리보기와 480px 썸네일을 만든다", async () => {
    const { preview, thumb, width, height } = await renderPreviews(await jpeg(4000, 3000));
    expect([width, height]).toEqual([4000, 3000]);

    const p = await sharp(preview).metadata();
    expect(p.format).toBe("webp");
    expect([p.width, p.height]).toEqual([2000, 1500]);

    const t = await sharp(thumb).metadata();
    expect(t.format).toBe("webp");
    expect(Math.max(t.width, t.height)).toBe(480);
  });

  it("EXIF 회전(세로 사진)을 반영한다", async () => {
    // 가로로 저장됐지만 orientation=6(90도 회전)인 세로 사진
    const { preview, width, height } = await renderPreviews(await jpeg(3000, 2000, 6));
    expect([width, height]).toEqual([2000, 3000]);
    const p = await sharp(preview).metadata();
    expect(p.height).toBeGreaterThan(p.width);
  });

  it("작은 사진은 키우지 않는다", async () => {
    const { preview } = await renderPreviews(await jpeg(800, 600));
    const p = await sharp(preview).metadata();
    expect([p.width, p.height]).toEqual([800, 600]);
  });

  it("워터마크가 실제로 픽셀을 바꾼다", async () => {
    const { preview } = await renderPreviews(await jpeg(1200, 800));
    const { data } = await sharp(preview).raw().toBuffer({ resolveWithObject: true });
    const distinct = new Set<number>();
    for (let i = 0; i < data.length; i += 3 * 97) distinct.add(data[i]);
    expect(distinct.size).toBeGreaterThan(3); // 단색 원본이면 1~2개여야 함
  });

  it("보정본(watermark: false)은 원본 픽셀을 그대로 줄인다", async () => {
    const { preview } = await renderPreviews(await jpeg(1200, 800), { watermark: false });
    const { data } = await sharp(preview).raw().toBuffer({ resolveWithObject: true });
    const distinct = new Set<number>();
    for (let i = 0; i < data.length; i += 3 * 97) distinct.add(data[i]);
    expect(distinct.size).toBeLessThanOrEqual(3); // 단색 원본 그대로
  });

  it("이미지가 아니면 에러를 던진다", async () => {
    await expect(renderPreviews(Buffer.from("not an image"))).rejects.toThrow();
  });
});
