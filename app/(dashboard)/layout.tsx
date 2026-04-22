import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Topbar } from "@/components/Topbar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const supabase = await createClient();
  
  // PERFORMANCE SÊNIOR: Buscamos tudo de uma vez no servidor (SSR)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const [
    { data: profile },
    { data: boards }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("boards").select("id, name").order("created_at", { ascending: false })
  ]);

  const userProfile = profile || { full_name: user.email, email: user.email, role: 'user' };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-indigo-500/30">
      
      {/* Sidebar agora recebe os dados instantaneamente, sem loadings na tela */}
      <Sidebar userProfile={userProfile} boards={boards || []} />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        <div className="relative z-30 flex w-full">
          <div className="absolute left-6 top-3 z-40 md:hidden">
            <MobileSidebar userProfile={userProfile} boards={boards || []} />
          </div>
          <Topbar user={user} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 custom-scrollbar relative">
          <div className="mx-auto w-full max-w-7xl animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}