import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createClient } from "@/lib/supabase/server";

// ─── GET Notifications ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  console.time("notifications query");
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, read, related_form_id, created_at")
    .eq("its_no", session.its_no)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  console.timeEnd("notifications query");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}