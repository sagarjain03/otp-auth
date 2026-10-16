"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { Button, Card, ErrorMessage, FullPageMessage, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth("guest");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/auth/send-otp", { method: "POST", body: { email } });
      // email goes in the URL (not localStorage) so /verify still works after a refresh
      router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") return <FullPageMessage>Loading...</FullPageMessage>;

  return (
    <Card title="Sign in" subtitle="Enter your email and we'll send you a 6-digit code. New here? The same code creates your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <ErrorMessage message={error} />
        <Button type="submit" loading={loading} loadingText="Sending code..." disabled={!email.trim()}>
          Send code
        </Button>
      </form>
    </Card>
  );
}
