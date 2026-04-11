import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as contentAPI from "@/lib/api/content";
import { ContentLibrary } from "./content-library";

export default async function ContentPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id, role")
    .eq("user_id", user!.id)
    .limit(1);

  const membership =
    memberships && memberships.length > 0 ? memberships[0] : null;
  const tenantId = membership?.tenant_id as string | undefined;

  if (!tenantId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-main-muted">
          No workspace found. Ensure your account is linked to a workspace.
        </p>
      </div>
    );
  }

  // Fetch data in parallel
  const [allResult, emailResult, smsResult, pushResult, assets] =
    await Promise.all([
      contentAPI.listTemplates(admin, tenantId),
      contentAPI.listTemplates(admin, tenantId, { channel: "email" }),
      contentAPI.listTemplates(admin, tenantId, { channel: "sms" }),
      contentAPI.listTemplates(admin, tenantId, { channel: "push" }),
      contentAPI.listAssets(admin, tenantId),
    ]);

  return (
    <ContentLibrary
      initialTemplates={allResult.templates}
      initialTotal={allResult.total}
      channelCounts={{
        email: emailResult.total,
        sms: smsResult.total,
        push: pushResult.total,
      }}
      initialAssets={assets}
    />
  );
}
