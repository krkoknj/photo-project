import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { formatDateKst, isSelectionLocked, shareUrl, toDateInputKst } from "@/lib/gallery";
import { siteUrl } from "@/lib/site";
import { presignView } from "@/lib/storage";
import {
  regenerateShareToken,
  removeGalleryPassword,
  reopenSelection,
  restoreGallery,
  setGalleryPassword,
  setGalleryVisibility,
  trashGallery,
  updateGallery,
} from "../actions";
import { GalleryForm } from "../gallery-form";
import { StatusBadge } from "../../status-badge";
import { PasswordForm } from "./password-form";
import { PhotoGrid, type GridPhoto } from "./photo-grid";
import { PhotoUploader } from "./photo-uploader";
import { CopyFilenamesButton, SelectionResults, type SelectedPhoto } from "./selection-results";
import { ConfirmSubmitButton, CopyLinkButton } from "./share-link";

export const metadata: Metadata = { title: "갤러리 설정" };

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function GalleryPage({ params }: PageProps<"/dashboard/galleries/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: gallery } = await supabase
    .from("galleries")
    .select(
      "id, title, client_name, client_email, share_token, password_hash, base_select_count, extra_price_krw, status, expires_at, trashed_at, created_at, photos(count)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!gallery) notFound();

  const [{ data: photoRows }, { data: selectionRows }, { data: pinRows }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, filename, processing_status, thumb_key, preview_key, width, height")
      .eq("gallery_id", gallery.id)
      .order("sort_order")
      .order("filename"),
    supabase.from("selections").select("photo_id, is_extra").eq("gallery_id", gallery.id),
    supabase.from("retouch_pins").select("id, photo_id, x, y, body").eq("gallery_id", gallery.id).order("created_at"),
  ]);

  const selectedById = new Map((selectionRows ?? []).map((s) => [s.photo_id, s]));
  // 선택이 빠진 사진에 남은 핀은 작가에게 보여주지 않는다.
  const pinsByPhoto = new Map<string, { id: string; x: number; y: number; body: string }[]>();
  for (const p of pinRows ?? []) {
    if (!selectedById.has(p.photo_id)) continue;
    const list = pinsByPhoto.get(p.photo_id) ?? [];
    list.push({ id: p.id, x: Number(p.x), y: Number(p.y), body: p.body });
    pinsByPhoto.set(p.photo_id, list);
  }

  const photos: GridPhoto[] = await Promise.all(
    (photoRows ?? []).map(async (p) => ({
      id: p.id,
      filename: p.filename,
      status: p.processing_status,
      thumbUrl: p.thumb_key ? await presignView(p.thumb_key) : null,
      selected: selectedById.has(p.id),
      pinCount: pinsByPhoto.get(p.id)?.length ?? 0,
    })),
  );

  const selectedPhotos: SelectedPhoto[] = await Promise.all(
    (photoRows ?? [])
      .filter((p) => selectedById.has(p.id))
      .map(async (p) => ({
        id: p.id,
        filename: p.filename,
        previewUrl: p.preview_key ? await presignView(p.preview_key) : null,
        aspect: p.width && p.height ? p.width / p.height : 3 / 2,
        isExtra: selectedById.get(p.id)!.is_extra,
        pins: pinsByPhoto.get(p.id) ?? [],
      })),
  );
  const totalPins = selectedPhotos.reduce((sum, p) => sum + p.pins.length, 0);
  const extraSelected = selectedPhotos.filter((p) => p.isExtra).length;

  const url = shareUrl(siteUrl(), gallery.share_token);
  const locked = isSelectionLocked(gallery.status);
  const canToggleVisibility = gallery.status === "draft" || gallery.status === "open";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
          ← 내 갤러리
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{gallery.title}</h1>
          <StatusBadge status={gallery.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {formatDateKst(gallery.created_at)} 생성 · 사진 {gallery.photos[0]?.count ?? 0}장
        </p>
      </div>

      {gallery.trashed_at && (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950 dark:text-amber-200">
          <span>휴지통에 있는 갤러리예요. 고객 링크가 열리지 않아요.</span>
          <form action={restoreGallery.bind(null, gallery.id)}>
            <button type="submit" className={buttonClass("secondary", "text-sm")}>
              복원
            </button>
          </form>
        </div>
      )}

      {(locked || selectedPhotos.length > 0) && (
        <Section
          title={`셀렉 결과 ${selectedPhotos.length}장`}
          description={
            gallery.status === "open"
              ? `고객이 고르는 중이에요 (기본 ${gallery.base_select_count}장). 제출하면 확정돼요.`
              : gallery.status === "awaiting_payment"
                ? `고객이 제출했고, 추가 ${extraSelected}장 결제를 기다리는 중이에요.`
                : `고객이 제출한 셀렉이에요. 보정 요청 ${totalPins}개.`
          }
        >
          {selectedPhotos.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <CopyFilenamesButton photos={selectedPhotos} />
              {(gallery.status === "submitted" || gallery.status === "awaiting_payment") && (
                <form action={reopenSelection.bind(null, gallery.id)}>
                  <ConfirmSubmitButton message="고객이 다시 고를 수 있도록 셀렉을 열까요? 고객이 다시 제출해야 확정돼요.">
                    셀렉 다시 열기
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
          )}
          <SelectionResults photos={selectedPhotos} />
        </Section>
      )}

      <Section
        title="고객 공유 링크"
        description={
          gallery.status === "draft"
            ? "비공개 상태예요. 사진을 올린 뒤 공개하면 고객이 링크로 셀렉할 수 있어요."
            : "고객은 로그인 없이 이 링크로 접속해요."
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            aria-label="공유 링크"
            className="min-w-0 flex-1 rounded-lg border border-black/15 bg-black/[.03] px-3 py-2.5 text-sm dark:border-white/20 dark:bg-white/[.04]"
          />
          <CopyLinkButton url={url} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {canToggleVisibility &&
            (gallery.status === "draft" ? (
              <form action={setGalleryVisibility.bind(null, gallery.id, "open")}>
                <button type="submit" className={buttonClass("primary", "text-sm")}>
                  고객에게 공개
                </button>
              </form>
            ) : (
              <form action={setGalleryVisibility.bind(null, gallery.id, "draft")}>
                <button type="submit" className={buttonClass("secondary", "text-sm")}>
                  비공개로 전환
                </button>
              </form>
            ))}
          <form action={regenerateShareToken.bind(null, gallery.id)}>
            <ConfirmSubmitButton message="링크를 새로 만들면 기존 링크는 더 이상 열리지 않아요. 계속할까요?">
              링크 재발급
            </ConfirmSubmitButton>
          </form>
        </div>
      </Section>

      <Section
        title="공유 비밀번호"
        description={
          gallery.password_hash
            ? "설정됨. 고객이 링크를 열 때 비밀번호를 입력해요."
            : "설정하지 않으면 링크만 있으면 누구나 볼 수 있어요."
        }
      >
        <PasswordForm action={setGalleryPassword.bind(null, gallery.id)} hasPassword={!!gallery.password_hash} />
        {gallery.password_hash && (
          <form action={removeGalleryPassword.bind(null, gallery.id)} className="mt-3">
            <ConfirmSubmitButton message="비밀번호를 해제할까요? 링크만 있으면 누구나 볼 수 있게 돼요.">
              비밀번호 해제
            </ConfirmSubmitButton>
          </form>
        )}
      </Section>

      <Section title="갤러리 설정">
        <GalleryForm
          mode="edit"
          action={updateGallery.bind(null, gallery.id)}
          selectionLocked={locked}
          defaults={{
            title: gallery.title,
            clientName: gallery.client_name ?? "",
            clientEmail: gallery.client_email ?? "",
            baseSelectCount: gallery.base_select_count,
            extraPriceKrw: gallery.extra_price_krw,
            expiresOn: gallery.expires_at ? toDateInputKst(gallery.expires_at) : "",
          }}
        />
      </Section>

      <Section
        title={`사진 ${photos.length}장`}
        description="원본은 고객에게 보이지 않아요. 고객은 워터마크가 들어간 미리보기만 봐요."
      >
        <div className="space-y-4">
          <PhotoUploader
            galleryId={gallery.id}
            disabledReason={
              gallery.trashed_at
                ? "휴지통에 있는 갤러리에는 사진을 올릴 수 없어요."
                : locked
                  ? "고객이 셀렉을 제출해서 사진을 추가하거나 뺄 수 없어요."
                  : undefined
            }
          />
          <PhotoGrid galleryId={gallery.id} photos={photos} editable={!locked && !gallery.trashed_at} />
        </div>
      </Section>

      {!gallery.trashed_at && (
        <Section title="휴지통으로 이동" description="고객 링크가 닫혀요. 휴지통에서 언제든 복원할 수 있어요.">
          <form action={trashGallery.bind(null, gallery.id)}>
            <ConfirmSubmitButton variant="danger" message="이 갤러리를 휴지통으로 옮길까요?">
              휴지통으로 이동
            </ConfirmSubmitButton>
          </form>
        </Section>
      )}
    </div>
  );
}
