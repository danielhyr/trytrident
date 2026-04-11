import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as segmentsAPI from "@/lib/api/segments";
import { AudienceTabs } from "./audience-tabs";

export default async function AudiencePage() {
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
  const role = (membership?.role ?? "viewer") as string;

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
  const [segments, contactResult, lifecycleCounts] = await Promise.all([
    segmentsAPI.listSegments(admin, tenantId),
    segmentsAPI.listContacts(admin, tenantId, { limit: 50 }),
    getLifecycleCounts(admin, tenantId),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
        Audience
      </h1>

      <AudienceTabs
        initialSegments={segments}
        initialContacts={contactResult.contacts}
        initialTotal={contactResult.total}
        lifecycleCounts={lifecycleCounts}
        role={role}
      />
    </div>
  );
}

async function getLifecycleCounts(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string
): Promise<Record<string, number>> {
  const stages = ["prospect", "active", "at_risk", "lapsed", "vip"];

  const counts = await Promise.all(
    stages.map((stage) =>
      admin
        .from("contact")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("lifecycle_stage", stage)
    )
  );

  const results: Record<string, number> = {};
  stages.forEach((stage, i) => {
    results[stage] = counts[i].count ?? 0;
  });

  const { count } = await admin
    .from("contact")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  results.total = count ?? 0;

  return results;
}
