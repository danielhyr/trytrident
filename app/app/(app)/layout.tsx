import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/shell/sidebar";
import { DotGridSpotlight } from "@/components/shell/dot-grid-spotlight";
import * as chatAPI from "@/lib/api/chat";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch tenant membership
  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("role, tenant:tenant_id(id, name)")
    .eq("user_id", user.id)
    .limit(1);

  let role = "owner";
  let tenantName = "My Workspace";

  if (memberships && memberships.length > 0) {
    const m = memberships[0];
    role = m.role;
    const t = m.tenant as unknown as { id: string; name: string };
    tenantName = t.name;
  } else {
    // Auto-provision a default tenant for new users
    const displayName =
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "My Workspace";

    const { data: tenant, error: tenantError } = await supabase
      .from("tenant")
      .insert({ name: `${displayName}'s Workspace` })
      .select("id, name")
      .single();

    if (tenant && !tenantError) {
      await supabase
        .from("user_tenant")
        .insert({ user_id: user.id, tenant_id: tenant.id, role: "owner" });

      tenantName = tenant.name;
    }
    // If provisioning fails, render with defaults rather than redirect-looping
  }

  // Fetch recent conversations for sidebar
  let recentConversations: Awaited<
    ReturnType<typeof chatAPI.listConversations>
  > = [];
  if (memberships && memberships.length > 0) {
    const t = memberships[0].tenant as unknown as { id: string; name: string };
    try {
      const admin = createAdminClient();
      recentConversations = await chatAPI.listConversations(
        admin,
        t.id,
        user.id,
        20
      );
    } catch {
      // Non-critical — sidebar will show empty list
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar
        userEmail={user.email ?? ""}
        userName={user.user_metadata?.full_name ?? user.email ?? "User"}
        role={role}
        recentConversations={recentConversations}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex flex-1 flex-col overflow-auto bg-dot-grid">
          <DotGridSpotlight />
          <div className="relative z-10 flex flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
