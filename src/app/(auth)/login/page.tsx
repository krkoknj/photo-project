import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <AuthCard title="다시 오셨네요">
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        initialError={error === "confirm_failed" ? "인증 링크가 만료되었거나 올바르지 않습니다." : undefined}
      />
    </AuthCard>
  );
}
