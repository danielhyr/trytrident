import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as chatAPI from "@/lib/api/chat";

export async function GET(req: NextRequest) {
  // Auth
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

  const messages = await chatAPI.getMessages(admin, conversationId);

  // Transform to UIMessage format (v4: parts-based)
  const formatted = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.content
        ? [{ type: "text" as const, text: m.content }]
        : [],
      createdAt: m.created_at,
    }));

  return NextResponse.json(formatted);
}
