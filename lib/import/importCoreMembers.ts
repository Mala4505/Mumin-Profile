import Papa from "papaparse";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CoreRowSchema,
  validateHeaders,
  type CoreRowInput,
} from "./validateCoreRow";

export interface ImportResult {
  importLogId: number;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
  errors: Array<{
    rowNumber: number;
    itsNo?: string;
    rawData: Record<string, string>;
    message: string;
  }>;
  status: "completed" | "completed_with_errors" | "failed";
}

export type ProgressEvent =
  | { type: "start"; total: number }
  | {
      type: "progress";
      phase: string;
      processed: number;
      total: number;
      inserted: number;
      updated: number;
      errors: number;
    }
  | { type: "error"; row: number; its_no?: string; message: string }
  | { type: "done"; result: ImportResult };

/**
 * Normalise DOB to YYYY-MM-DD regardless of input format.
 * Handles: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD
 * Returns null if the value cannot be parsed.
 */
function parseDob(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Already YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
    return s.replace(/\//g, "-");
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const match = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface BuildingRecord {
  building_id: number;
  street: string | null;
  landmark: string | null;
}

interface MuminRawPayload {
  its_no: number;
  sabeel_no: string;
  subsector_id: number;
  name: string;
  gender: string;
  date_of_birth: string | null;
  balig_status: string;
  phone?: string;
  family_type?: string;
  _csvRole: string;
}

export async function importCoreMembers(
  csvText: string,
  filename: string,
  importedByItsNo: number,
  onProgress?: (event: ProgressEvent) => void,
): Promise<ImportResult> {
  const admin = createAdminClient();

  // Create import_log entry
  const { data: logRow, error: logErr } = await admin
    .from("import_log")
    .insert({
      import_type: "core",
      filename,
      imported_by: importedByItsNo,
      status: "running",
    })
    .select("id")
    .single();

  if (logErr || !logRow) {
    throw new Error(`Failed to create import log: ${logErr?.message}`);
  }
  const importLogId = logRow.id;

  try {
    // ── Phase 1: Parse CSV ──────────────────────────────────
    const parsedCsv = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
    });

    const headers = parsedCsv.meta.fields ?? [];
    const missingHeaders = validateHeaders(headers);

    if (missingHeaders.length > 0) {
      await admin
        .from("import_log")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_summary: { missing_headers: missingHeaders },
        })
        .eq("id", importLogId);

      return {
        importLogId,
        totalRows: 0,
        insertedRows: 0,
        updatedRows: 0,
        errorRows: 0,
        errors: [
          {
            rowNumber: 0,
            rawData: {},
            message: `Missing required headers: ${missingHeaders.join(", ")}`,
          },
        ],
        status: "failed",
      };
    }

    const rows = parsedCsv.data;
    const totalRows = rows.length;
    const errors: ImportResult["errors"] = [];

    onProgress?.({ type: "start", total: totalRows });

    // ── Phase 2: Load reference data ─────────────────────────
    const [{ data: sectors }, { data: subsectors }, { data: buildings }] =
      await Promise.all([
        admin.from("sector").select("sector_id, sector_name"),
        admin
          .from("subsector")
          .select("subsector_id, sector_id, subsector_name"),
        admin
          .from("building")
          .select("building_id, subsector_id, building_name, street, landmark"),
      ]);

    const sectorMap = new Map(
      (sectors ?? []).map((s) => [s.sector_name.toLowerCase(), s.sector_id]),
    );
    const subsectorMap = new Map(
      (subsectors ?? []).map((s) => [
        `${s.sector_id}::${s.subsector_name.toLowerCase()}`,
        s.subsector_id,
      ]),
    );

    // building map: key = "subsector_id::building_name_lower", value = full record
    const buildingMap = new Map<string, BuildingRecord>(
      (buildings ?? []).map((b) => [
        `${b.subsector_id}::${b.building_name.toLowerCase()}`,
        { building_id: b.building_id, street: b.street, landmark: b.landmark },
      ]),
    );

    // ── Phase 3: Validation + reference resolution loop ──────
    // Collect payloads for batch upsert — no DB calls for house/family/mumin here
    const housePayloads = new Map<string, Record<string, unknown>>(); // key: paci_no
    const familyPayloads = new Map<string, Record<string, unknown>>(); // key: sabeel_no
    const allMuminPayloads: MuminRawPayload[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // 1-based + header row
      const raw = rows[i] as Record<string, string>;

      if (i % 100 === 0) {
        onProgress?.({
          type: "progress",
          phase: "Validating rows…",
          processed: i,
          total: totalRows,
          inserted: 0,
          updated: 0,
          errors: errors.length,
        });
      }

      // Row validation
      const parsed_row = CoreRowSchema.safeParse(raw);
      if (!parsed_row.success) {
        const msg = parsed_row.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        errors.push({ rowNumber: rowNum, rawData: raw, message: msg });
        onProgress?.({ type: "error", row: rowNum, message: msg });
        await admin.from("import_error_detail").insert({
          import_id: importLogId,
          row_number: rowNum,
          raw_row_data: raw,
          error_message: msg,
          its_no: null,
        });
        continue;
      }

      const row: CoreRowInput = parsed_row.data;
      const csvRole = (row.Role ?? "Mumin") as "Mumin" | "Masool" | "Musaid";

      // ── SECTOR RESOLUTION (auto-create if missing) ──
      let sectorId = sectorMap.get(row.Sector.toLowerCase());
      if (!sectorId) {
        const { data: newSector, error: sErr } = await admin
          .from("sector")
          .insert({ sector_name: row.Sector })
          .select("sector_id")
          .single();
        if (sErr || !newSector) {
          const msg = `Failed to create sector "${row.Sector}": ${sErr?.message}`;
          errors.push({
            rowNumber: rowNum,
            itsNo: row.ITS_NO,
            rawData: raw,
            message: msg,
          });
          onProgress?.({ type: "error", row: rowNum, its_no: row.ITS_NO, message: msg });
          await admin.from("import_error_detail").insert({
            import_id: importLogId,
            row_number: rowNum,
            raw_row_data: raw,
            error_message: msg,
            its_no: parseInt(row.ITS_NO),
          });
          continue;
        }
        sectorId = newSector.sector_id;
        sectorMap.set(row.Sector.toLowerCase(), sectorId);
      }

      // ── SUBSECTOR RESOLUTION (auto-create if missing) ──
      const subsectorKey = `${sectorId}::${row.SubSector.toLowerCase()}`;
      let subsectorId = subsectorMap.get(subsectorKey);
      if (!subsectorId) {
        const { data: newSubsector, error: ssErr } = await admin
          .from("subsector")
          .insert({ sector_id: sectorId, subsector_name: row.SubSector })
          .select("subsector_id")
          .single();
        if (ssErr || !newSubsector) {
          const msg = `Failed to create subsector "${row.SubSector}": ${ssErr?.message}`;
          errors.push({
            rowNumber: rowNum,
            itsNo: row.ITS_NO,
            rawData: raw,
            message: msg,
          });
          onProgress?.({ type: "error", row: rowNum, its_no: row.ITS_NO, message: msg });
          await admin.from("import_error_detail").insert({
            import_id: importLogId,
            row_number: rowNum,
            raw_row_data: raw,
            error_message: msg,
            its_no: parseInt(row.ITS_NO),
          });
          continue;
        }
        subsectorId = newSubsector.subsector_id;
        subsectorMap.set(subsectorKey, subsectorId);
      }

      // ── BUILDING RESOLUTION (auto-create if missing) ──
      const buildingKey = `${subsectorId}::${row.Building.toLowerCase()}`;
      let buildingRecord = buildingMap.get(buildingKey);

      if (!buildingRecord) {
        const { data: newBuilding, error: bErr } = await admin
          .from("building")
          .insert({
            subsector_id: subsectorId,
            building_name: row.Building,
            street: row.Street ?? null,
            landmark: row.Landmark ?? null,
          })
          .select("building_id")
          .single();
        if (bErr || !newBuilding) {
          const msg = `Failed to create building "${row.Building}": ${bErr?.message}`;
          errors.push({
            rowNumber: rowNum,
            itsNo: row.ITS_NO,
            rawData: raw,
            message: msg,
          });
          onProgress?.({ type: "error", row: rowNum, its_no: row.ITS_NO, message: msg });
          continue;
        }
        buildingRecord = {
          building_id: newBuilding.building_id,
          street: row.Street ?? null,
          landmark: row.Landmark ?? null,
        };
        buildingMap.set(buildingKey, buildingRecord);
      } else {
        // Existing building — update street/landmark only if CSV provides a value that differs
        const needsStreetUpdate =
          row.Street && row.Street !== buildingRecord.street;
        const needsLandmarkUpdate =
          row.Landmark && row.Landmark !== buildingRecord.landmark;

        if (needsStreetUpdate || needsLandmarkUpdate) {
          const updatePayload: Record<string, string> = {};
          if (needsStreetUpdate) updatePayload.street = row.Street!;
          if (needsLandmarkUpdate) updatePayload.landmark = row.Landmark!;

          await admin
            .from("building")
            .update(updatePayload)
            .eq("building_id", buildingRecord.building_id);

          buildingMap.set(buildingKey, {
            ...buildingRecord,
            street: needsStreetUpdate ? row.Street! : buildingRecord.street,
            landmark: needsLandmarkUpdate
              ? row.Landmark!
              : buildingRecord.landmark,
          });
          buildingRecord = buildingMap.get(buildingKey)!;
        }
      }

      const buildingId = buildingRecord.building_id;

      // Collect house payload (deduplicated by paci_no — last writer wins)
      housePayloads.set(row.PACI_NO, {
        paci_no: row.PACI_NO,
        building_id: buildingId,
        floor_no: row.Floor_No ?? null,
        flat_no: row.Flat_No ?? null,
      });

      // Collect family payload (deduplicated by sabeel_no)
      familyPayloads.set(row.Sabeel_No, {
        sabeel_no: row.Sabeel_No,
        paci_no: row.PACI_NO,
      });

      // Collect mumin payload
      const muminPayload: MuminRawPayload = {
        its_no: parseInt(row.ITS_NO),
        sabeel_no: row.Sabeel_No,
        subsector_id: subsectorId,
        name: row.Name,
        gender: row.Gender as "M" | "F",
        date_of_birth: row.DOB ? parseDob(row.DOB) : null,
        balig_status: row.Balig as "Balig" | "Ghair Balig",
        _csvRole: csvRole,
      };
      if (row.Phone) muminPayload.phone = row.Phone;
      if (row.Family_Type) muminPayload.family_type = row.Family_Type;

      allMuminPayloads.push(muminPayload);
    }

    onProgress?.({
      type: "progress",
      phase: "Upserting houses…",
      processed: totalRows,
      total: totalRows,
      inserted: 0,
      updated: 0,
      errors: errors.length,
    });

    // ── Phase 4: Batch upsert houses ─────────────────────────
    const houseArr = [...housePayloads.values()];
    for (const chunk of chunkArray(houseArr, 500)) {
      await admin.from("house").upsert(chunk as any, { onConflict: "paci_no" });
    }

    onProgress?.({
      type: "progress",
      phase: "Upserting families…",
      processed: totalRows,
      total: totalRows,
      inserted: 0,
      updated: 0,
      errors: errors.length,
    });

    // ── Phase 5: Batch upsert families ───────────────────────
    const familyArr = [...familyPayloads.values()];
    for (const chunk of chunkArray(familyArr, 500)) {
      await admin.from("family").upsert(chunk as any, { onConflict: "sabeel_no" });
    }

    onProgress?.({
      type: "progress",
      phase: "Upserting mumin…",
      processed: totalRows,
      total: totalRows,
      inserted: 0,
      updated: 0,
      errors: errors.length,
    });

    // ── Phase 6: Pre-fetch existing mumin ITS nos ────────────
    // Replaces ~7000 individual "does this row exist?" queries with a handful of batch queries
    const existingSet = new Set<number>();
    const allItsNos = allMuminPayloads.map((p) => p.its_no);
    for (const chunk of chunkArray(allItsNos, 1000)) {
      const { data: existingRows } = await admin
        .from("mumin")
        .select("its_no")
        .in("its_no", chunk);
      for (const r of (existingRows ?? []) as any[]) {
        existingSet.add(r.its_no as number);
      }
    }

    // ── Phase 7: Batch upsert mumin ──────────────────────────
    // Group by column profile to ensure uniform columns within each batch
    // (PostgREST requires uniform columns per batch for correct ON CONFLICT behaviour)
    // Profile key: `${isNew}_${hasPhone}_${hasFamilyType}`
    const muminGroups = new Map<string, Record<string, unknown>[]>();
    let insertedRows = 0;
    let updatedRows = 0;

    for (const p of allMuminPayloads) {
      const isNew = !existingSet.has(p.its_no);
      const hasPhone = p.phone !== undefined;
      const hasFamilyType = p.family_type !== undefined;

      const base: Record<string, unknown> = {
        its_no: p.its_no,
        sabeel_no: p.sabeel_no,
        subsector_id: p.subsector_id,
        name: p.name,
        gender: p.gender,
        date_of_birth: p.date_of_birth,
        balig_status: p.balig_status,
      };
      if (hasPhone) base.phone = p.phone;
      if (hasFamilyType) base.family_type = p.family_type;

      // status and role: only set for new inserts — never overwrite on re-import
      if (isNew) {
        base.status = "active";
        base.role = p._csvRole;
        insertedRows++;
      } else {
        updatedRows++;
      }

      const groupKey = `${isNew}_${hasPhone}_${hasFamilyType}`;
      if (!muminGroups.has(groupKey)) muminGroups.set(groupKey, []);
      muminGroups.get(groupKey)!.push(base);
    }

    for (const group of muminGroups.values()) {
      for (const chunk of chunkArray(group, 500)) {
        const { error: upsertErr } = await admin
          .from("mumin")
          .upsert(chunk as any, { onConflict: "its_no" });
        if (upsertErr) {
          errors.push({
            rowNumber: 0,
            rawData: {},
            message: `Batch mumin upsert failed: ${upsertErr.message}`,
          });
        }
      }
    }

    const errorRows = errors.length;
    const status: ImportResult["status"] =
      errorRows === 0
        ? "completed"
        : errorRows === totalRows
          ? "failed"
          : "completed_with_errors";

    // Update import_log with final counts
    await admin
      .from("import_log")
      .update({
        status,
        completed_at: new Date().toISOString(),
        total_rows: totalRows,
        inserted_rows: insertedRows,
        updated_rows: updatedRows,
        error_rows: errorRows,
        error_summary:
          errorRows > 0 ? { first_errors: errors.slice(0, 5) } : null,
      })
      .eq("id", importLogId);

    const result: ImportResult = {
      importLogId,
      totalRows,
      insertedRows,
      updatedRows,
      errorRows,
      errors,
      status,
    };

    onProgress?.({ type: "done", result });
    return result;
  } catch (err) {
    await admin
      .from("import_log")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_summary: { message: String(err) },
      })
      .eq("id", importLogId);
    throw err;
  }
}
