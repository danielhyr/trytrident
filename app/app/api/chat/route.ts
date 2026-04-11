import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createChatTools } from "@/lib/chat/tools";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import * as chatAPI from "@/lib/api/chat";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1);

  const membership =
    memberships && memberships.length > 0 ? memberships[0] : null;

  if (!membership) {
    return new Response("No workspace found", { status: 403 });
  }

  const tenantId = membership.tenant_id as string;
  const role = membership.role as string;
  const admin = createAdminClient();

  // 2. Parse request
  const { messages, conversationId: existingConversationId } = await req.json();

  // 3. Resolve or create conversation
  let conversationId = existingConversationId as string | undefined;

  if (!conversationId) {
    const conversation = await chatAPI.createConversation(
      admin,
      tenantId,
      user.id
    );
    conversationId = conversation.id;
  }

  // 4. Save the latest user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    // v4 UIMessage format: extract text from parts array
    const userText =
      lastMessage.parts
        ?.filter((p: { type: string }) => p.type === "text")
        .map((p: { type: string; text: string }) => p.text)
        .join("") ||
      (typeof lastMessage.content === "string" ? lastMessage.content : "");
    await chatAPI.saveMessage(admin, conversationId, "user", userText);
  }

  // 5. Build tools and system prompt
  const tools = createChatTools(admin, tenantId, user.id);
  const userName =
    user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";

  const systemPrompt = buildSystemPrompt({
    tenantId,
    role,
    userName,
  });

  // 6. Stream response
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, toolCalls }) => {
      // Save assistant message
      if (text) {
        await chatAPI.saveMessage(
          admin,
          conversationId!,
          "assistant",
          text,
          toolCalls && toolCalls.length > 0 ? toolCalls : undefined
        );
      }

      // Auto-title on first exchange: if conversation still has default title
      try {
        const conv = await chatAPI.getConversation(admin, conversationId!);
        if (conv.title === "New Chat" && lastMessage?.role === "user") {
          const titleText =
            lastMessage.parts
              ?.filter((p: { type: string }) => p.type === "text")
              .map((p: { type: string; text: string }) => p.text)
              .join("") ||
            (typeof lastMessage.content === "string"
              ? lastMessage.content
              : "New conversation");
          const title =
            titleText.length > 50
              ? titleText.substring(0, 47) + "..."
              : titleText;
          await chatAPI.updateConversationTitle(admin, conversationId!, title);
        }
      } catch {
        // Non-critical — don't fail the response
      }
    },
  });

  // 7. Return streaming response with conversation ID header
  const response = result.toUIMessageStreamResponse({
    headers: {
      "X-Conversation-Id": conversationId,
    },
  });

  return response;
}
