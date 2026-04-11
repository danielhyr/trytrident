import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as journeysAPI from "@/lib/api/journeys";
import { JourneyCanvas } from "./journey-canvas";

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  if (!tenantId) return notFound();

  let journey;
  try {
    journey = await journeysAPI.getJourney(admin, tenantId, id);
  } catch {
    return notFound();
  }

  const stats = await journeysAPI.getJourneyStats(admin, tenantId, id);

  return <JourneyCanvas journey={journey} stats={stats} />;
}
