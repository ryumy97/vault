import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { getSession } from "@/lib/auth/session";

export default async function SignInPage() {
  const session = await getSession();
  if (session) {
    redirect("/dir");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <SignInForm />
    </div>
  );
}
