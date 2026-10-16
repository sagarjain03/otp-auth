"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// Where a logged-in user belongs: name not set yet -> finish the profile first.
export function homeFor(user) {
  return user.name ? "/dashboard" : "/complete-profile";
}

// Asks the server who is logged in (GET /api/auth/me) and redirects:
//   mode "protected": not logged in -> /login
//   mode "guest":     logged in     -> /dashboard or /complete-profile
// The check runs every time the page is shown, including the browser Back button.
export function useAuth(mode) {
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // "checking" | "ready"
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    api("/auth/me")
      .then((data) => {
        if (!active) return;
        if (mode === "guest") {
          router.replace(homeFor(data.user));
        } else {
          setUser(data.user);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!active) return;
        if (mode === "protected") {
          router.replace("/login");
        } else {
          setStatus("ready");
        }
      });

    // page hidden (navigated away): hide content until the next check finishes
    return () => {
      active = false;
      setStatus("checking");
    };
  }, [mode, router]);

  return { status, user };
}
