"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { Button, Card, ErrorMessage, FullPageMessage } from "@/components/ui";

export default function DashboardPage() {
  const router = useRouter();
  const { status, user } = useAuth("protected");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // logged in but no name yet -> finish the profile first
  useEffect(() => {
    if (status === "ready" && !user.name) router.replace("/complete-profile");
  }, [status, user, router]);

  async function handleLogout() {
    setLoading(true);
    setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      // no need to clear user here: useAuth hides this page's data as soon as we leave
      router.replace("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking" || !user.name) return <FullPageMessage>Loading...</FullPageMessage>;

  return (
    <Card title={`Welcome, ${user.name}`} subtitle="You're signed in.">
      <dl className="space-y-3 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50">
        <div>
          <dt className="text-zinc-500">Name</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Email</dt>
          <dd className="font-medium break-all">{user.email}</dd>
        </div>
      </dl>
      <div className="mt-6 space-y-3">
        <ErrorMessage message={error} />
        <Button variant="secondary" onClick={handleLogout} loading={loading} loadingText="Logging out...">
          Log out
        </Button>
      </div>
    </Card>
  );
}
