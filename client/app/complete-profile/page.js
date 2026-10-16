"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { Button, Card, ErrorMessage, FullPageMessage, Input } from "@/components/ui";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { status, user } = useAuth("protected");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // name already set -> nothing to do here
  useEffect(() => {
    if (status === "ready" && user.name) router.replace("/dashboard");
  }, [status, user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/auth/profile", { method: "PATCH", body: { name } });
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking" || user.name) return <FullPageMessage>Loading...</FullPageMessage>;

  return (
    <Card title="One last step" subtitle={`What should we call you? You're signed in as ${user.email}.`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Your name"
          autoComplete="name"
          placeholder="Jane Doe"
          maxLength={50}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <ErrorMessage message={error} />
        <Button type="submit" loading={loading} loadingText="Saving..." disabled={!name.trim()}>
          Continue
        </Button>
      </form>
    </Card>
  );
}
