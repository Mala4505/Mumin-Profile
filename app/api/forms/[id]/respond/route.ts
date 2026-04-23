// app/api/forms/[id]/respond/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createClient } from "@/lib/supabase/server";
import { isAuthorizedFiller } from "@/lib/forms/checkFillerAccess";
import type { FillerAccess } from "@/lib/types/forms";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  const { data: form, error: formErr } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .single();
  if (formErr || !form)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  if (form.status !== "published") {
    return NextResponse.json(
      { error: "Form is not open for responses" },
      { status: 400 },
    );
  }

  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json({ error: "Form has expired" }, { status: 400 });
  }

  const fillerAccess = form.filler_access as FillerAccess | null;
  if (!fillerAccess || !isAuthorizedFiller(fillerAccess, session)) {
    return NextResponse.json(
      { error: "Not authorized to fill this form" },
      { status: 403 },
    );
  }

  if (session.role === "Mumin") {
    const { data: inAudience } = await supabase
      .from("form_audience")
      .select("its_no")
      .eq("form_id", id)
      .eq("its_no", Number(session.its_no))
      .single();

    if (!inAudience)
      return NextResponse.json(
        { error: "Not in form audience" },
        { status: 403 },
      );
  }

  const { responses } = await req.json();

  // Normalize payload: SelfFillForm sends { profile_field_id, its_no, answer, remarks }
  // but process_form_submission RPC expects { field_id, its_no, answer, remarks }
  const normalized = (responses as Array<{
    profile_field_id?: number
    field_id?: number
    its_no: number
    answer: string
    remarks?: string
  }>).map((r) => ({
    field_id: r.field_id ?? r.profile_field_id,
    its_no: r.its_no,
    answer: r.answer,
    remarks: r.remarks ?? '',
  }));

  const { error: rpcErr } = await supabase.rpc('process_form_submission', {
    p_form_id: id,
    p_filled_by: Number(session.its_no),
    p_responses: normalized,
  });

  if (rpcErr)
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
