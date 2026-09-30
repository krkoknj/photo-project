import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "작가 가입" };

export default function SignupPage() {
  return (
    <AuthCard title={"작가 계정을\n만들어볼까요?"}>
      <SignupForm />
    </AuthCard>
  );
}
