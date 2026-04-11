import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as contentAPI from "@/lib/api/content";

const BUCKET = "content-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1);

  const membership = memberships?.[0];
  if (!membership) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }
  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  const tenantId = membership.tenant_id as string;
  const admin = createAdminClient();

  // 2. Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 3. Validate
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `File type not allowed. Supported: ${ALLOWED_TYPES.map((t) => t.split("/")[1]).join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  // 4. Upload to Supabase Storage
  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `${tenantId}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // 5. Get public URL
  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  // 6. Create asset record in DB
  try {
    const asset = await contentAPI.createAsset(admin, tenantId, {
      name: file.name,
      file_path: storagePath,
      public_url: publicUrl,
      mime_type: file.type,
      file_size_bytes: file.size,
    });

    return NextResponse.json({ asset });
  } catch (err) {
    // Clean up uploaded file if DB insert fails
    await admin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create asset record",
      },
      { status: 500 }
    );
  }
}
