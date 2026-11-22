import type { Metadata } from "next";

import { DemoBanner } from "@/components/demo-banner";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Kamshin Admin" },
  robots: { index: false, follow: false },
};

// The admin only opens on ADMIN_HOST (proxy.ts rewrites admin.yourdomain.com/* to /admin/*; /admin on the
// store host is a 404). The panel layout and every admin page also call requireAdmin().
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <DemoBanner />
      {children}
    </>
  );
}
