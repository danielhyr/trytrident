import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { previewSms, previewPush, previewEmail } from "@/lib/content/preview";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { channel } = body;

  try {
    if (channel === "sms") {
      const text = await previewSms(body.body ?? "");
      return NextResponse.json({ text });
    }

    if (channel === "push") {
      const result = await previewPush({
        title: body.title ?? "",
        body: body.body ?? "",
      });
      return NextResponse.json(result);
    }

    if (channel === "email") {
      // MJML → HTML compilation happens client-side.
      // This endpoint receives already-compiled HTML for Liquid rendering.
      const result = await previewEmail({
        subject: body.subject ?? "",
        preheader: body.preheader ?? "",
        bodyHtml: body.bodyHtml ?? "",
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid channel" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Preview rendering failed",
      },
      { status: 500 }
    );
  }
}
