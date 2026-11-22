import { AdminMobileBar, AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth/guards";
import { storeOrigin } from "@/lib/routing/hosts";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Every admin page and server action also calls requireAdmin() itself: layouts don't guard
  // server actions, and checking next to the data is what actually protects it.
  const admin = await requireAdmin();
  const identity = { name: admin.name, email: admin.email };
  const storeUrl = storeOrigin();

  return (
    <div className="flex min-h-dvh flex-1 bg-[#f7f3ee]">
      <AdminSidebar admin={identity} storeUrl={storeUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar admin={identity} storeUrl={storeUrl} />
        <main id="main" className="flex-1 px-4 py-8 sm:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
