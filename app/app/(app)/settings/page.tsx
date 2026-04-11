import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceNameEditor } from "./workspace-name-editor";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("role, tenant:tenant_id(id, name)")
    .eq("user_id", user.id)
    .limit(1);

  let tenantName = "My Workspace";
  let role = "owner";

  if (memberships && memberships.length > 0) {
    const m = memberships[0];
    role = m.role;
    const t = m.tenant as unknown as { id: string; name: string };
    tenantName = t.name;
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
        Settings
      </h1>
      <p className="mt-1 text-sm text-text-main-muted">
        Brand, channels, and configuration
      </p>

      <div className="mt-8 space-y-8">
        {/* Workspace section */}
        <section>
          <h2 className="text-sm font-medium text-text-main">Workspace</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-4">
            <WorkspaceNameEditor
              currentName={tenantName}
              isOwner={role === "owner"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
