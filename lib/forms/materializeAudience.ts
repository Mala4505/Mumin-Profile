import { createClient } from "@/lib/supabase/server";
import { AudienceFilters } from "@/lib/types/forms";
import { ageToDobRange } from "@/lib/members/ageToDobRange";

export async function materializeAudience(
  formId: string,
  filters: AudienceFilters,
): Promise<void> {
  const supabase = await createClient();

  let query = supabase.from("mumin").select("its_no");

  if (!filters.all) {
    if (filters.gender) query = query.eq("gender", filters.gender);
    if (filters.balig_status !== undefined)
      query = query.eq("balig_status", filters.balig_status);

    // Sector filter: resolve to subsector IDs first, then filter by subsector_id
    if (filters.sector_ids?.length) {
      const { data: subs, error: subErr } = await supabase
        .from("subsector")
        .select("subsector_id")
        .in("sector_id", filters.sector_ids.map(Number));

      if (subErr) throw new Error(`Subsector lookup failed: ${subErr.message}`);

      const subsectorIds = (subs ?? []).map((s) => s.subsector_id);
      if (!subsectorIds.length) return; // no subsectors in these sectors = empty audience

      query = query.in("subsector_id", subsectorIds);
    }

    if (filters.subsector_ids?.length) {
      query = query.in(
        "subsector_id",
        filters.subsector_ids.map((id) => Number(id)),
      );
    }

    if (filters.age_from || filters.age_to) {
      const { minDob, maxDob } = ageToDobRange(filters.age_from, filters.age_to);
      if (minDob) query = query.gte("date_of_birth", minDob);
      if (maxDob) query = query.lte("date_of_birth", maxDob);
    }
  }

  const { data: members, error } = await query;
  if (error) throw new Error(`Audience query failed: ${error.message}`);

  const rows = (members ?? []).map((m) => ({
    form_id: formId,
    its_no: m.its_no as number,
  }));

  if (!rows.length) return;

  const { error: insertErr } = await supabase
    .from("form_audience")
    .upsert(rows, { onConflict: "form_id,its_no", ignoreDuplicates: true });

  if (insertErr)
    throw new Error(`Audience insert failed: ${insertErr.message}`);
}
