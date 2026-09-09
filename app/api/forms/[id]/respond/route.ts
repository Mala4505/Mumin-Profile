// app/api/forms/[id]/respond/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    // form_audience has no usable end-user SELECT policy on the live DB — read
    // the caller's own membership row with the service role.
    const { data: inAudience } = await createAdminClient()
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
  const isSelfFiller = session.role === 'Mumin'
  const normalized = (responses as Array<{
    profile_field_id?: number
    field_id?: number
    its_no: number
    answer: string
    remarks?: string
  }>)
    .map((r) => ({
      field_id: r.field_id ?? r.profile_field_id,
      // A self-filler can only ever write their own record — never trust the
      // its_no in the payload for them (the RPC below runs as SECURITY DEFINER
      // and would otherwise bypass row-level checks).
      its_no: isSelfFiller ? Number(session.its_no) : r.its_no,
      answer: r.answer,
      remarks: r.remarks ?? '',
    }))
    .filter((r): r is typeof r & { field_id: number } => r.field_id != null)

  // Every submission — simple or detailed — goes through process_form_submission so
  // that each answer produces a form_responses audit row. Response counts, the
  // responses view and analytics all read form_responses, so a direct profile_value
  // write (the old 'simple' path) left self-fill and bulk-fill submissions invisible.
  // The RPC routes each answer to profile_value / form_responses by profile_field.behavior.
  const { error: rpcErr } = await supabase.rpc('process_form_submission', {
    p_form_id: id,
    p_filled_by: Number(session.its_no),
    p_responses: normalized,
  })
  if (rpcErr)
    return NextResponse.json({ error: rpcErr.message }, { status: 500 })

  return NextResponse.json({ success: true });
}
