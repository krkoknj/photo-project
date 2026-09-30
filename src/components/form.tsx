import type { ReactNode } from "react";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  // 제출 후 React가 폼을 초기화하므로, 입력값을 돌려받아 defaultValue로 다시 채운다.
  values?: Record<string, string>;
};

// 밑줄형 입력: 테두리 없이 아래 선만, 포커스 시 오렌지
const inputClass =
  "w-full border-0 border-b border-line-strong bg-transparent px-0 py-2.5 text-base text-fg outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:opacity-40 aria-invalid:border-danger [color-scheme:dark]";

export function Field({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block text-muted">{label}</span>
      <input {...props} aria-invalid={error ? true : undefined} className={inputClass} />
      {error ? (
        <span className="mt-1.5 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const buttonVariants = {
  primary: "bg-accent text-ink hover:bg-accent-hover",
  secondary: "border border-line-strong text-fg hover:border-fg",
  danger: "border border-danger/50 text-danger hover:border-danger",
};

export function buttonClass(variant: keyof typeof buttonVariants = "primary", extra = "") {
  return `inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium tracking-tight transition-colors disabled:pointer-events-none disabled:opacity-40 ${buttonVariants[variant]} ${extra}`;
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
      <p role="alert" className="border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="border-l-2 border-ok bg-ok/10 px-3 py-2 text-sm text-ok">
        {message}
      </p>
    );
  }
  return null;
}
