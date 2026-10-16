// Every request goes to /api on our own origin. next.config.mjs rewrites it to
// Express, so the browser sends the httpOnly cookie automatically (same-origin).
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // show the backend's message as-is (e.g. "Please wait 42s ...")
    const error = new Error(data.message || "Something went wrong, please try again");
    error.status = res.status;
    throw error;
  }

  return data;
}
