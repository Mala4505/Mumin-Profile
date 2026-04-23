// app/api/forms/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createClient } from "@/lib/supabase/server";
import { materializeAudience } from "@/lib/forms/materializeAudience";
import type { AudienceFilters } from "@/lib/types/forms";
import type { Database } from "@/lib/types/database";

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "SuperAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  // Fetch form for audience_filters and title
  const { data: form, error: formErr } = await supabase
    .from("forms")
    .select("audience_filters, title, status")
    .eq("id", id)
    .single();

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
  if (form.status !== "pending_approval") {
    return NextResponse.json(
      { error: "Form not in pending_approval state" },
      { status: 400 },
    );
  }

  // Materialize audience (cast Json -> AudienceFilters safely)
  if (form.audience_filters) {
    await materializeAudience(
      id,
      form.audience_filters as unknown as AudienceFilters,
    );
  }

  // Update form status and record approval
  const { data, error } = await supabase
    .from("forms")
    .update({
      status: "published",
      approved_by: Number(session.its_no),          // ✅ integer
      approved_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send form_assigned notifications to audience
  const { data: audience } = await supabase
    .from("form_audience")
    .select("its_no")
    .eq("form_id", id);

  if (audience && audience.length) {
    const notifications: Database["public"]["Tables"]["notifications"]["Insert"][] =
      audience.map((a) => ({
        its_no: a.its_no,
        type: "form_assigned",
        title: `New form: ${form.title}`,
        body: "A form has been assigned to you.",
        related_form_id: id,
      }));

    await supabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({ form: data });
}
