import type { ReactNode } from "react";
import Link from "next/link";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-sm font-semibold tracking-tight">
          셀렉갤러리
        </Link>
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <h1 className="mb-6 text-xl font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 text-base outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
      />
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-black px-4 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
    >
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
