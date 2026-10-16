"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/useAuth";
import { Button, Card, ErrorMessage, FullPageMessage, Input } from "@/components/ui";

const RESEND_SECONDS = 60; // matches the server's resend cooldown

export default function VerifyForm() {
  const router = useRouter();
  const email = useSearchParams().get("email") || "";
  const { status } = useAuth("guest");

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // no email in the URL -> nothing to verify, go back to /login
  useEffect(() => {
    if (!email) router.replace("/login");
  }, [email, router]);

  // countdown: tick once a second until it reaches 0
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifying(true);
    setError("");
    setInfo("");
    try {
      const data = await api("/auth/verify-otp", { method: "POST", body: { email, otp } });
      // replace (not push) so Back doesn't return to this page
      router.replace(homeFor(data.user));
    } catch (err) {
      setError(err.message);
      setOtp("");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setInfo("");
    try {
      await api("/auth/send-otp", { method: "POST", body: { email } });
      setInfo("A new code has been sent.");
      setOtp("");
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  if (status === "checking" || !email) return <FullPageMessage>Loading...</FullPageMessage>;

  const busy = verifying || resending;

  return (
    <Card
      title="Enter your code"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-medium text-zinc-900 dark:text-zinc-100">{email}</span>. It expires in 5 minutes.
        </>
      }
    >
      <form onSubmit={handleVerify} className="space-y-4">
        <Input
          id="otp"
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2.5 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
          value={otp}
          // keep digits only, max 6
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={busy}
          autoFocus
        />
        <ErrorMessage message={error} />
        {info && <p className="text-sm text-green-700 dark:text-green-400">{info}</p>}
        <Button type="submit" loading={verifying} loadingText="Verifying..." disabled={otp.length !== 6 || resending}>
          Verify
        </Button>
      </form>

      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleResend}
          loading={resending}
          loadingText="Sending..."
          disabled={secondsLeft > 0 || verifying}
        >
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Wrong email?{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Change it
        </Link>
      </p>
    </Card>
  );
}
