import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            PulseBoard
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your account to continue
          </p>
        </div>

        {!process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-amber-700 text-sm">
            <p className="font-semibold mb-1">Setup Required</p>
            <p>
              Please configure your Supabase environment variables in the .env
              file to enable authentication.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
