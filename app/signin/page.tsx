import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignInForm } from "@/components/sign-in-form";
import { getSession } from "@/lib/auth/session";

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <Suspense fallback={<SignInForm />}>
        <SignInGate />
      </Suspense>
    </div>
  );
}

async function SignInGate() {
  const session = await getSession();
  if (session) {
    redirect("/dir");
  }
  return <SignInForm />;
}
