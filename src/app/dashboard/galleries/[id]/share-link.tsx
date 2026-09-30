"use client";

import { useState } from "react";
import { buttonClass } from "@/components/form";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("링크를 복사하세요", url);
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonClass("primary", "shrink-0 text-sm")}>
      {copied ? "복사됨" : "링크 복사"}
    </button>
  );
}

// 되돌릴 수 없는 동작은 확인 후 제출한다.
export function ConfirmSubmitButton({
  message,
  children,
  variant = "secondary",
}: {
  message: string;
  children: React.ReactNode;
  variant?: "secondary" | "danger";
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={buttonClass(variant, "text-sm")}
    >
      {children}
    </button>
  );
}
