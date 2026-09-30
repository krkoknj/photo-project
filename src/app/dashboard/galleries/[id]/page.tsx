import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { formatDateKst, formatKrw, isSelectionLocked, shareUrl, toDateInputKst } from "@/lib/gallery";
import { getPaymentOptions } from "@/lib/payments";
import { extraAmount } from "@/lib/selection";
import { siteUrl } from "@/lib/site";
import { presignView } from "@/lib/storage";
import type { Enums } from "@/lib/supabase/database.types";
import {
  confirmManualPayment,
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
import { RetouchPanel, type RetouchedItem } from "./retouch-panel";
import { CopyFilenamesButton, SelectionResults, type SelectedPhoto } from "./selection-results";
import { ConfirmSubmitButton, CopyLinkButton } from "./share-link";

export const metadata: Metadata = { title: "갤러리 설정" };

const NOTIFICATION_LABEL: Record<Enums<"notification_type">, string> = {
  selection_submitted: "셀렉 제출·결제 알림 (작가)",
  retouch_delivered: "보정본 도착 알림 (고객)",
  expiry_warning: "만료 예정 알림 (고객)",
};

// 섹션 번호(01, 02…)는 CSS 카운터로 자동으로 붙인다 (조건부로 빠지는 섹션이 있어도 순서가 맞게).
function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line pt-8 [counter-increment:section] lg:grid-cols-[16rem_1fr] lg:gap-12">
      <div>
        <p className="eyebrow mb-3 text-accent before:content-[counter(section,decimal-leading-zero)]" />
        <h2 className="display text-3xl">{title}</h2>
        {description && <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function GalleryPage({ params }: PageProps<"/dashboard/galleries/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();

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
      .select("id, filename, processing_status, thumb_key, preview_key, width, height, original_purged_at")
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
  const purgedCount = (photoRows ?? []).filter((p) => p.original_purged_at).length;
  const totalPins = selectedPhotos.reduce((sum, p) => sum + p.pins.length, 0);
  const extraSelected = selectedPhotos.filter((p) => p.isExtra).length;
  const extraDue = extraAmount(selectedPhotos.length, gallery);

  const canDeliver = gallery.status === "submitted" || gallery.status === "delivered";
  const [{ data: paidOrders }, paymentOptions, { data: retouchedRows }, { data: notifications }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, method, extra_count, amount_krw, paid_at")
      .eq("gallery_id", gallery.id)
      .eq("status", "paid")
      .order("paid_at"),
    getPaymentOptions(userId),
    canDeliver
      ? supabase
          .from("retouched_files")
          .select("id, filename, photo_id, processing_status, thumb_key")
          .eq("gallery_id", gallery.id)
          .order("filename")
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("notifications")
      .select("id, type, recipient, status, created_at")
      .eq("gallery_id", gallery.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const retouched: RetouchedItem[] = await Promise.all(
    (retouchedRows ?? []).map(async (r) => ({
      id: r.id,
      filename: r.filename,
      photoId: r.photo_id,
      status: r.processing_status,
      thumbUrl: r.thumb_key ? await presignView(r.thumb_key) : null,
    })),
  );
  const noPaymentMethod = gallery.extra_price_krw > 0 && !paymentOptions.toss && !paymentOptions.bank;

  const url = shareUrl(siteUrl(), gallery.share_token);
  const locked = isSelectionLocked(gallery.status);
  const canToggleVisibility = gallery.status === "draft" || gallery.status === "open";

  return (
    <div className="space-y-14 [counter-reset:section]">
      <div>
        <Link href="/dashboard" className="eyebrow text-muted hover:text-accent">
          ← 내 갤러리
        </Link>
        <h1 className="display mt-6 text-[clamp(2.75rem,7vw,6rem)] break-words">{gallery.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <StatusBadge status={gallery.status} />
          <span className="eyebrow text-muted">
            {formatDateKst(gallery.created_at)} 생성 · 사진 {gallery.photos[0]?.count ?? 0}장
            {gallery.client_name && ` · ${gallery.client_name}`}
          </span>
        </div>
      </div>

      {gallery.status === "expired" && (
        <div className="border border-line bg-panel p-4 text-sm text-fg/80">
          공유 기간이 끝나 고객 링크가 닫혔고 원본은 정리됐어요 (정리된 원본 {purgedCount}장). 아래 설정에서 만료일을 미래로
          바꾸면 링크가 다시 열려요. 미리보기와 보정본은 그대로 남아 있어요.
        </div>
      )}

      {gallery.trashed_at && (
        <div className="flex flex-col gap-3 border border-accent/40 bg-accent/10 p-4 text-sm text-fg sm:flex-row sm:items-center sm:justify-between">
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
              {(gallery.status === "submitted" || gallery.status === "awaiting_payment") && !paidOrders?.length && (
                <form action={reopenSelection.bind(null, gallery.id)}>
                  <ConfirmSubmitButton message="고객이 다시 고를 수 있도록 셀렉을 열까요? 고객이 다시 제출해야 확정돼요.">
                    셀렉 다시 열기
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
          )}
          {gallery.status === "awaiting_payment" && (
            <div className="mb-4 flex flex-col gap-3 border border-accent/40 bg-accent/10 p-4 text-sm text-fg sm:flex-row sm:items-center sm:justify-between">
              <span>
                추가 {extraSelected}장 · {formatKrw(extraDue)} 결제 대기 중. 계좌로 입금받았다면 확인을 눌러주세요.
              </span>
              <form action={confirmManualPayment.bind(null, gallery.id)}>
                <ConfirmSubmitButton message={`${formatKrw(extraDue)} 입금을 확인했나요? 확인하면 셀렉이 확정돼요.`}>
                  입금 확인
                </ConfirmSubmitButton>
              </form>
            </div>
          )}
          {!!paidOrders?.length && (
            <ul className="mb-4 space-y-1 text-sm">
              {paidOrders.map((o) => (
                <li key={o.id} className="text-ok">
                  ✓ 추가 {o.extra_count}장 {formatKrw(o.amount_krw)} 결제 완료 ({o.method === "toss" ? "카드" : "계좌이체"}
                  {o.paid_at && ` · ${formatDateKst(o.paid_at)}`})
                </li>
              ))}
            </ul>
          )}
          <SelectionResults photos={selectedPhotos} />
        </Section>
      )}

      {canDeliver && !gallery.trashed_at && (
        <Section
          title="보정본 전달"
          description="보정본 파일명이 원본과 같으면(예: IMG_1234-edit.jpg → IMG_1234) 자동으로 연결돼요. 고객은 워터마크 없이 원본 화질로 받아요."
        >
          <div className="space-y-5">
            <PhotoUploader galleryId={gallery.id} kind="retouched" />
            {!gallery.client_email && (
              <p className="text-sm text-accent">
                고객 이메일이 없어서 보정본 도착 메일을 보내지 않아요. 아래 갤러리 설정에서 추가할 수 있어요.
              </p>
            )}
            <RetouchPanel
              galleryId={gallery.id}
              delivered={gallery.status === "delivered"}
              files={retouched}
              photos={(photoRows ?? []).map((p) => ({ id: p.id, filename: p.filename, selected: selectedById.has(p.id) }))}
            />
          </div>
        </Section>
      )}

      {noPaymentMethod && (
        <div className="border border-accent/40 bg-accent/10 p-4 text-sm text-fg">
          추가 보정 가격을 정했지만 결제 방법이 없어요. 고객이 추가 결제를 할 수 있도록{" "}
          <Link href="/dashboard/settings" className="font-medium underline">
            결제 설정
          </Link>
          에서 토스페이먼츠 키나 계좌를 등록해주세요.
        </div>
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
            className="min-w-0 flex-1 rounded-sm border border-line-strong bg-panel px-3 py-2.5 text-sm"
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

      {!!notifications?.length && (
        <Section title="알림 기록" description="최근 10건">
          <ul className="space-y-1.5 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-x-2">
                <span className={n.status === "failed" ? "text-danger" : n.status === "sent" ? "text-ok" : "text-muted"}>
                  {n.status === "sent" ? "보냄" : n.status === "failed" ? "실패" : "대기"}
                </span>
                <span>{NOTIFICATION_LABEL[n.type]}</span>
                <span className="text-muted">
                  → {n.recipient} · {formatDateKst(n.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

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
