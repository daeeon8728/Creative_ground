"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Login form
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPw, setRegPw] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await signIn("credentials", {
        identifier: loginId,
        password: loginPw,
        redirect: false,
      });
      if (result?.error) {
        setError("이메일/아이디 또는 비밀번호가 올바르지 않습니다.");
      } else {
        router.push("/boards");
      }
    });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          username: regUsername,
          password: regPw,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "회원가입 실패");
        return;
      }
      // Auto-login after register
      const result = await signIn("credentials", {
        identifier: regEmail,
        password: regPw,
        redirect: false,
      });
      if (result?.error) {
        setError("회원가입은 완료됐으나 로그인에 실패했습니다. 다시 시도해주세요.");
      } else {
        router.push("/boards");
      }
    });
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-16 relative">
      {/* Theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* Logo / wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12 text-center"
      >
        <h1
          className="font-display text-[5rem] leading-none tracking-tight uppercase text-[var(--ink)] select-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Fragments
        </h1>
        <p
          className="mt-3 text-[var(--pencil)] text-sm tracking-wide"
          style={{ fontFamily: "var(--font-body)" }}
        >
          콜라주 보드 × 기획 도구
        </p>

        {/* Decorative accent line */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-0.5 w-12 bg-[var(--riso-blue)]" />
          <div className="h-2 w-2 rounded-full bg-[var(--riso-yellow)]" />
          <div className="h-0.5 w-12 bg-[var(--riso-coral)]" />
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div
          className="
            relative bg-[var(--surface)] border-2 border-[var(--ink)]
            shadow-riso-blue p-8
          "
        >
          {/* Tab switcher */}
          <div className="flex mb-8 border-b-2 border-[var(--ink)]">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                id={`tab-${m}`}
                onClick={() => { setMode(m); setError(""); }}
                className={`
                  flex-1 py-2 text-sm font-semibold tracking-wide uppercase transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
                  ${mode === m
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--pencil)] hover:text-[var(--ink)]"
                  }
                `}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {m === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <Field
                  id="login-identifier"
                  label="이메일 또는 아이디"
                  type="text"
                  value={loginId}
                  onChange={setLoginId}
                  autoComplete="username"
                  required
                />
                <Field
                  id="login-password"
                  label="비밀번호"
                  type="password"
                  value={loginPw}
                  onChange={setLoginPw}
                  autoComplete="current-password"
                  required
                />

                {error && <ErrorMessage message={error} />}

                <SubmitButton loading={isPending} label="로그인" />
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <Field
                  id="reg-name"
                  label="이름"
                  type="text"
                  value={regName}
                  onChange={setRegName}
                  autoComplete="name"
                  required
                />
                <Field
                  id="reg-email"
                  label="이메일"
                  type="email"
                  value={regEmail}
                  onChange={setRegEmail}
                  autoComplete="email"
                  required
                />
                <Field
                  id="reg-username"
                  label="아이디"
                  type="text"
                  value={regUsername}
                  onChange={setRegUsername}
                  autoComplete="username"
                  required
                />
                <Field
                  id="reg-password"
                  label="비밀번호 (8자 이상)"
                  type="password"
                  value={regPw}
                  onChange={setRegPw}
                  autoComplete="new-password"
                  required
                />

                {error && <ErrorMessage message={error} />}

                <SubmitButton loading={isPending} label="회원가입" />
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Decorative offset block */}
        <div className="h-1 w-full bg-[var(--riso-yellow)] mt-0" />
      </motion.div>

      {/* Footer tagline */}
      <p
        className="mt-10 text-xs text-[var(--pencil)] text-center"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        no ads · no tracking · your boards stay in your browser
      </p>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Field({
  id, label, type, value, onChange, autoComplete, required,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-[var(--pencil)] mb-1"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="
          w-full border-2 border-[var(--ink)] bg-[var(--paper)]
          text-[var(--ink)] px-3 py-2 text-sm
          placeholder:text-[var(--pencil)]
          focus:outline-none focus:border-[var(--riso-blue)]
          focus:shadow-[0_0_0_3px_var(--riso-blue)]
          transition-shadow
        "
        style={{ fontFamily: "var(--font-body)" }}
      />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="border-2 border-[var(--riso-coral)] bg-[var(--riso-coral)]/10 px-3 py-2 text-sm text-[var(--riso-coral)]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {message}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      id="submit-btn"
      type="submit"
      disabled={loading}
      className="
        w-full mt-2 py-3 font-semibold uppercase tracking-wider text-sm
        bg-[var(--ink)] text-[var(--paper)]
        border-2 border-[var(--ink)]
        shadow-riso-blue
        hover:translate-x-[-2px] hover:translate-y-[-2px]
        hover:shadow-[6px_6px_0px_var(--riso-blue)]
        active:translate-x-[2px] active:translate-y-[2px]
        active:shadow-none
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
      "
      style={{ fontFamily: "var(--font-body)" }}
    >
      {loading ? "처리 중…" : label}
    </button>
  );
}
