import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as chatAPI from "@/lib/api/chat";

export async function GET() {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tenant
  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1);

  const membership =
    memberships && memberships.length > 0 ? memberships[0] : null;

  if (!membership) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  const admin = createAdminClient();
  const conversations = await chatAPI.listConversations(
    admin,
    membership.tenant_id as string,
    user.id,
    20
  );

  return NextResponse.json(conversations);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("id");
  if (!conversationId) {
    return NextResponse.json(
      { error: "Missing conversation id" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify the conversation belongs to this user
  try {
    const conversation = await chatAPI.getConversation(admin, conversationId);
    if (conversation.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await chatAPI.deleteConversation(admin, conversationId);

  return NextResponse.json({ ok: true });
}
