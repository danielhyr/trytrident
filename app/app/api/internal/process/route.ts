import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processRawEvents } from "@/lib/ingestion/processor";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const stats = await processRawEvents(admin);

  return NextResponse.json({ status: "ok", stats });
}
