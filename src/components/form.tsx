import type { ReactNode } from "react";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  // 제출 후 React가 폼을 초기화하므로, 입력값을 돌려받아 defaultValue로 다시 채운다.
  values?: Record<string, string>;
};

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 text-base outline-none focus:border-black disabled:opacity-50 dark:border-white/20 dark:focus:border-white aria-invalid:border-red-500";

export function Field({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <input {...props} aria-invalid={error ? true : undefined} className={inputClass} />
      {error ? (
        <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-neutral-500">{hint}</span>
      ) : null}
    </label>
  );
}

const buttonVariants = {
  primary: "bg-black text-white dark:bg-white dark:text-black",
  secondary: "border border-black/15 dark:border-white/20",
  danger: "border border-red-600/40 text-red-700 dark:text-red-400",
};

export function buttonClass(variant: keyof typeof buttonVariants = "primary", extra = "") {
  return `inline-flex items-center justify-center rounded-lg px-4 py-2.5 font-medium disabled:opacity-50 ${buttonVariants[variant]} ${extra}`;
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
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
        {message}
      </p>
    );
  }
  return null;
}
