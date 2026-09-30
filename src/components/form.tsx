import type { ReactNode } from "react";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  // 제출 후 React가 폼을 초기화하므로, 입력값을 돌려받아 defaultValue로 다시 채운다.
  values?: Record<string, string>;
};

// 밑줄형 입력: 아래 선만, 포커스 시 검정
const inputClass =
  "w-full border-0 border-b border-line-strong bg-transparent px-0 py-3 text-base text-fg outline-none transition-colors placeholder:text-muted/70 focus:border-fg disabled:opacity-40 aria-invalid:border-danger";

export function Field({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[0.8125rem] font-medium text-muted">{label}</span>
      <input {...props} aria-invalid={error ? true : undefined} className={inputClass} />
      {error ? (
        <span className="mt-1.5 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

// 주요 버튼은 검정, 보조는 회색 테두리, 브랜드 강조는 오렌지
const buttonVariants = {
  primary: "bg-fg text-ink hover:bg-fg/85",
  accent: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-line-strong bg-ink text-fg hover:bg-panel",
  danger: "border border-danger/40 bg-ink text-danger hover:bg-danger/5",
};

export function buttonClass(variant: keyof typeof buttonVariants = "primary", extra = "") {
  return `inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-5 text-[0.9375rem] font-bold transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${buttonVariants[variant]} ${extra}`;
}

export function SubmitButton({
  pending,
  children,
  variant = "primary",
  className = "w-full",
}: {
  pending: boolean;
  children: ReactNode;
  variant?: keyof typeof buttonVariants;
  className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, className)}>
      {pending ? "처리 중…" : children}
    </button>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-xl bg-ok/8 px-4 py-3 text-sm text-ok">
        {message}
      </p>
    );
  }
  return null;
}
