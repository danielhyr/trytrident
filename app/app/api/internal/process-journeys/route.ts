import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processWaitingEnrollments } from "@/lib/journeys/engine";
import { processQueuedMessages } from "@/lib/sendgrid/sender";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Advance waiting enrollments + process scheduled segment sends (may queue new messages)
  const enrollmentStats = await processWaitingEnrollments(admin);

  // 2. Drain the message queue — send queued emails via SendGrid
  const messageStats = await processQueuedMessages(admin);

  return NextResponse.json({ status: "ok", enrollmentStats, messageStats });
}
