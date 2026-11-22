"use client";

import { useTransition } from "react";
import { ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setUserRoleAction } from "@/lib/actions/admin/customers";
import { safeAction } from "@/lib/client/safe-action";
import type { Role } from "@/lib/models/user";

import { ConfirmDialog } from "./confirm-dialog";

export function RoleBadge({ role }: { role: Role }) {
  return role === "ADMIN" ? (
    <Badge variant="default"><ShieldCheck className="size-3" aria-hidden /> Admin</Badge>
  ) : (
    <Badge variant="outline"><User className="size-3" aria-hidden /> Customer</Badge>
  );
}

// The server blocks changing your own role and removing the last admin.
export function RoleControl({ userId, name, role, isSelf }: { userId: string; name: string; role: Role; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const promote = role === "CUSTOMER";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">Role: <RoleBadge role={role} /></div>
      {isSelf ? (
        <p className="text-xs text-muted-foreground">You can&apos;t change your own role.</p>
      ) : (
        <ConfirmDialog
          trigger={
            <Button variant={promote ? "default" : "outline"} className="w-full" disabled={pending}>
              {pending ? "Saving…" : promote ? "Make admin" : "Remove admin access"}
            </Button>
          }
          title={promote ? `Make ${name} an admin?` : `Remove admin access from ${name}?`}
          description={
            promote
              ? "They'll be able to sign in to the admin dashboard and manage products, orders and customers."
              : "They'll become a regular customer and lose access to the admin dashboard immediately."
          }
          confirmLabel={promote ? "Make admin" : "Remove access"}
          destructive={!promote}
          onConfirm={() =>
            startTransition(async () => {
              const result = await safeAction(() => setUserRoleAction(userId, promote ? "ADMIN" : "CUSTOMER"));
              if (!result) return;
              if (result.ok) toast.success(result.message ?? "Role updated");
              else toast.error(result.message ?? "Couldn't change the role");
            })
          }
        />
      )}
    </div>
  );
}
