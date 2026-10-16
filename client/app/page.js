import { redirect } from "next/navigation";

// "/" has no content of its own. /login sends logged-in users on to the dashboard.
export default function Home() {
  redirect("/login");
}
