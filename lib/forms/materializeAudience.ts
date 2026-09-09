import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AudienceFilters } from "@/lib/types/forms";
import { ageToDobRange } from "@/lib/members/ageToDobRange";

export interface MaterializeAudienceOptions {
  /**
   * Remove existing form_audience rows whose member no longer matches the
   * filters. Off by default (publish is purely additive); the edit-form flow
   * turns it on so the audience always mirrors the current filters.
   */
  prune?: boolean;
  /**
   * Resolve the member list with the service-role client instead of the
   * request-scoped one. The wizard/publish path deliberately resolves under the
   * caller's RLS scope (a Masool publishing "all" gets their sector); editing an
   * already-published form needs the real, unscoped audience.
   */
  fullScope?: boolean;
}

export interface MaterializeAudienceResult {
  /** ITS numbers newly added to form_audience by this call. */
  added: number[];
  /** ITS numbers removed from form_audience by this call (only when prune). */
  removed: number[];
}

export async function materializeAudience(
  formId: string,
  filters: AudienceFilters,
  opts: MaterializeAudienceOptions = {},
): Promise<MaterializeAudienceResult> {
  const admin = createAdminClient();
  const reader = opts.fullScope ? admin : await createClient();

  let query = reader.from("mumin").select("its_no");

  let noMatch = false;

  if (!filters.all) {
    if (filters.gender) query = query.eq("gender", filters.gender);
    if (filters.balig_status !== undefined)
      query = query.eq("balig_status", filters.balig_status);

    // Sector filter: resolve to subsector IDs first, then filter by subsector_id
    if (filters.sector_ids?.length) {
      const { data: subs, error: subErr } = await reader
        .from("subsector")
        .select("subsector_id")
        .in("sector_id", filters.sector_ids.map(Number));

      if (subErr) throw new Error(`Subsector lookup failed: ${subErr.message}`);

      const subsectorIds = (subs ?? []).map((s) => s.subsector_id);
      if (!subsectorIds.length) {
        noMatch = true; // no subsectors in these sectors = empty audience
      } else {
        query = query.in("subsector_id", subsectorIds);
      }
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

  const resolved = new Set<number>();
  if (!noMatch) {
    const { data: members, error } = await query;
    if (error) throw new Error(`Audience query failed: ${error.message}`);
    for (const m of members ?? []) resolved.add(m.its_no as number);
  }

  // form_audience has no usable end-user INSERT/SELECT policy on the live DB, so
  // every read and write here goes through the service role.
  const { data: existingRows, error: exErr } = await admin
    .from("form_audience")
    .select("its_no")
    .eq("form_id", formId);
  if (exErr) throw new Error(`Audience read failed: ${exErr.message}`);

  const existing = new Set<number>(
    (existingRows ?? []).map((r) => r.its_no as number),
  );

  const added = [...resolved].filter((its) => !existing.has(its));
  const removed = opts.prune
    ? [...existing].filter((its) => !resolved.has(its))
    : [];

  if (added.length) {
    const { error: insertErr } = await admin
      .from("form_audience")
      .upsert(
        added.map((its_no) => ({ form_id: formId, its_no })),
        { onConflict: "form_id,its_no", ignoreDuplicates: true },
      );
    if (insertErr)
      throw new Error(`Audience insert failed: ${insertErr.message}`);
  }

  if (removed.length) {
    const { error: delErr } = await admin
      .from("form_audience")
      .delete()
      .eq("form_id", formId)
      .in("its_no", removed);
    if (delErr) throw new Error(`Audience prune failed: ${delErr.message}`);
  }

  return { added, removed };
}
