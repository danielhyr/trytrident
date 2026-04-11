import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as contentAPI from "@/lib/api/content";
import { EmailEditor } from "../email-editor";
import { notFound } from "next/navigation";

export default async function EditEmailPage({
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
    .select("tenant_id")
    .eq("user_id", user!.id)
    .limit(1);

  const tenantId = memberships?.[0]?.tenant_id as string | undefined;
  if (!tenantId) notFound();

  try {
    const template = await contentAPI.getTemplate(admin, tenantId, id);
    if (template.channel !== "email") notFound();
    return (
      <div className="flex flex-1">
        <EmailEditor template={template} />
      </div>
    );
  } catch {
    notFound();
  }
}
