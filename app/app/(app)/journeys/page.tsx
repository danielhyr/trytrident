import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as journeysAPI from "@/lib/api/journeys";
import { JourneyList } from "./journey-list";

export default async function JourneysPage() {
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

  // Fetch journeys + stats in parallel
  const { journeys, total } = await journeysAPI.listJourneys(admin, tenantId);

  const journeysWithStats = await Promise.all(
    journeys.map(async (j) => {
      const stats = await journeysAPI.getJourneyStats(admin, tenantId, j.id);
      return { ...j, stats };
    })
  );

  return (
    <JourneyList
      initialJourneys={journeysWithStats}
      initialTotal={total}
    />
  );
}
