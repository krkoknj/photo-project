import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { decryptSecret, maskKey } from "@/lib/secret-box";
import { createAdminClient } from "@/lib/supabase/admin";
import { keyMode } from "@/lib/toss";
import { ConfirmSubmitButton } from "../galleries/[id]/share-link";
import { removeBankAccount, removeTossKeys } from "./actions";
import { BankAccountForm, TossKeyForm } from "./settings-forms";

export const metadata: Metadata = { title: "결제 설정" };

export default async function SettingsPage() {
  const { userId } = await requireUser();
  const { data: settings } = await createAdminClient()
    .from("payment_settings")
    .select("toss_client_key, toss_secret_key_encrypted, bank_name, bank_account, bank_holder")
    .eq("photographer_id", userId)
    .maybeSingle();

  const toss =
    settings?.toss_client_key && settings.toss_secret_key_encrypted
      ? {
          clientKey: settings.toss_client_key,
          maskedSecret: maskKey(decryptSecret(settings.toss_secret_key_encrypted)),
          mode: keyMode(settings.toss_client_key),
        }
      : null;
  const hasBank = !!(settings?.bank_name && settings.bank_account && settings.bank_holder);

  return (
    <div className="space-y-0">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-fg">
          ‹ 내 갤러리
        </Link>
        <h1 className="display mt-4 text-[1.75rem]">결제 설정</h1>
        <p className="mt-1 text-sm text-muted">
          고객이 기본 장수를 넘겨 고르면 추가 보정 비용을 받아요. 결제금은 작가님께 바로 들어가요.
        </p>
      </div>

      <section className="band -mx-5 px-5 pt-7 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-extrabold">카드·간편결제 (토스페이먼츠)</h2>
          {toss && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                toss.mode === "live"
                  ? "border border-ok/40 bg-ok/10 text-ok"
                  : "border border-accent/40 bg-accent/10 text-accent"
              }`}
            >
              {toss.mode === "live" ? "실결제 연결됨" : "테스트 키 연결됨"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          토스페이먼츠 개발자센터의 <strong>API 개별 연동 키</strong>를 넣어주세요. 실제 결제를 받으려면 토스페이먼츠
          가맹점 계약이 필요해요.
        </p>
        {toss && (
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-panel p-4 text-sm">
            <dt className="text-muted">클라이언트 키</dt>
            <dd className="truncate font-mono">{toss.clientKey}</dd>
            <dt className="text-muted">시크릿 키</dt>
            <dd className="font-mono">{toss.maskedSecret}</dd>
          </dl>
        )}
        <div className="mt-4">
          <TossKeyForm connected={!!toss} />
        </div>
        {toss && (
          <form action={removeTossKeys} className="mt-3">
            <ConfirmSubmitButton message="토스페이먼츠 연결을 해제할까요? 고객이 카드로 결제할 수 없게 돼요.">
              연결 해제
            </ConfirmSubmitButton>
          </form>
        )}
      </section>

      <section className="band -mx-5 px-5 pt-7 pb-8">
        <h2 className="text-lg font-extrabold">계좌이체</h2>
        <p className="mt-1 text-sm text-muted">
          고객에게 이 계좌를 안내해요. 입금을 확인한 뒤 갤러리 화면에서 &lsquo;입금 확인&rsquo;을 누르면 셀렉이 확정돼요.
        </p>
        <div className="mt-4">
          <BankAccountForm
            initial={{
              bankName: settings?.bank_name ?? "",
              account: settings?.bank_account ?? "",
              holder: settings?.bank_holder ?? "",
            }}
          />
        </div>
        {hasBank && (
          <form action={removeBankAccount} className="mt-3">
            <ConfirmSubmitButton message="계좌 안내를 지울까요?">계좌 삭제</ConfirmSubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
