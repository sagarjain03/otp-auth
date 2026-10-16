import { Suspense } from "react";
import { FullPageMessage } from "@/components/ui";
import VerifyForm from "./VerifyForm";

// VerifyForm reads ?email= with useSearchParams, which Next.js requires
// to be inside a <Suspense> boundary.
export default function VerifyPage() {
  return (
    <Suspense fallback={<FullPageMessage>Loading...</FullPageMessage>}>
      <VerifyForm />
    </Suspense>
  );
}
