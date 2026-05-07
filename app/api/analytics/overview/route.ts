// import { NextResponse } from "next/server";
// import { getSession } from "@/lib/auth/getSession";
// import { createClient } from "@/lib/supabase/server";

// export async function GET() {
//   // Replace the old SuperAdmin-only check
//   const session = await getSession();

//   // This allows all management roles to pass through
//   const allowedRoles = ["SuperAdmin", "Admin", "Masool", "Musaid"];

//   if (!session || !allowedRoles.includes(session.role)) {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

//   // For now, keep the rest of your database queries "global"
//   // (no .in('subsector_id', ...) filters yet)
//   const supabase = await createClient();
//   const now = new Date().toISOString();

//   // Fetch members who have at least one profile_value entry
//   const { data: muminWithProfile } = await supabase
//     .from("profile_value")
//     .select("its_no")
//     .limit(10000);

//   const itsNosWithProfile = muminWithProfile
//     ? [...new Set(muminWithProfile.map((r: { its_no: number }) => r.its_no))]
//     : [];

//   const [
//     { count: activeForms },
//     { count: totalMuminCount },
//     { data: recentImports },
//     { count: overdueForms },
//   ] = await Promise.all([
//     supabase
//       .from("forms")
//       .select("*", { count: "exact", head: true })
//       .eq("status", "published"),
//     supabase.from("mumin").select("its_no", { count: "exact", head: true }),
//     supabase
//       .from("import_log")
//       .select("*")
//       .order("created_at", { ascending: false })
//       .limit(5),
//     supabase
//       .from("forms")
//       .select("*", { count: "exact", head: true })
//       .eq("status", "published")
//       .lt("expires_at", now)
//       .not("expires_at", "is", null),
//   ]);

//   const membersWithNoProfile =
//     itsNosWithProfile.length === 0
//       ? (totalMuminCount ?? 0)
//       : Math.max(0, (totalMuminCount ?? 0) - itsNosWithProfile.length);

//   return NextResponse.json({
//     activeForms: activeForms ?? 0,
//     membersWithNoProfile,
//     recentImports: recentImports ?? [],
//     overdueForms: overdueForms ?? 0,
//   });
// }

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getSession();

  // Logic Change: Allow Masool and Musaid to pass the gate
  const allowedRoles = ["SuperAdmin", "Admin", "Masool", "Musaid"];

  if (!session || !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: muminWithProfile } = await supabase
    .from("profile_value")
    .select("its_no")
    .limit(10000);

  const itsNosWithProfile = muminWithProfile
    ? [...new Set(muminWithProfile.map((r: { its_no: number }) => r.its_no))]
    : [];

  const [
    { count: activeForms },
    { count: totalMuminCount },
    { data: recentImports },
    { count: overdueForms },
  ] = await Promise.all([
    supabase
      .from("forms")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("mumin").select("its_no", { count: "exact", head: true }),
    supabase
      .from("import_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("forms")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .lt("expires_at", now)
      .not("expires_at", "is", null),
  ]);

  const membersWithNoProfile =
    itsNosWithProfile.length === 0
      ? (totalMuminCount ?? 0)
      : Math.max(0, (totalMuminCount ?? 0) - itsNosWithProfile.length);

  return NextResponse.json({
    activeForms: activeForms ?? 0,
    membersWithNoProfile,
    recentImports: recentImports ?? [],
    overdueForms: overdueForms ?? 0,
  });
}


// import { NextResponse } from "next/server";
// import { getSession } from "@/lib/auth/getSession";
// import { createClient } from "@/lib/supabase/server";
// import { resolveScope } from "@/lib/analytics/resolveScope";

// export async function GET() {
//   const session = await getSession();

//   // 1. Unified Permission Check
//   const allowedRoles = ["SuperAdmin", "Admin", "Masool", "Musaid"];
//   if (!session || !allowedRoles.includes(session.role)) {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

//   const supabase = await createClient();
//   const now = new Date().toISOString();

//   try {
//     // 2. Resolve Scope (Returns null for SuperAdmin/Masool/Musaid bypass)
//     const scopedSubsectorIds = await resolveScope(session);
    
//     // 3. Prepare Base Queries
//     const formsQuery = supabase
//       .from("forms")
//       .select("*", { count: "exact", head: true })
//       .eq("status", "published");

//     const muminQuery = supabase
//       .from("mumin")
//       .select("its_no", { count: "exact", head: true })
//       .eq("status", "active");

//     const overdueQuery = supabase
//       .from("forms")
//       .select("*", { count: "exact", head: true })
//       .eq("status", "published")
//       .lt("expires_at", now)
//       .not("expires_at", "is", null);

//     // Apply scoping to Mumin count if not bypassed
//     if (scopedSubsectorIds !== null) {
//       muminQuery.in("subsector_id", scopedSubsectorIds);
//     }

//     // 4. Execute Parallel Count Queries
//     const [
//       { count: activeForms },
//       { count: totalMuminCount },
//       { count: overdueForms },
//       { data: recentImports }
//     ] = await Promise.all([
//       formsQuery,
//       muminQuery,
//       overdueQuery,
//       supabase
//         .from("import_log")
//         .select("*")
//         .order("created_at", { ascending: false })
//         .limit(5)
//     ]);

//     // 5. Calculate Response Data
//     // We fetch unique respondents across ALL forms to see overall engagement
//     let responseQuery = supabase
//       .from("form_responses")
//       .select("filled_for")
//       .not("filled_for", "is", null);

//     // If scoped, we need to filter responses to only those within the Masool's scope
//     if (scopedSubsectorIds !== null) {
//       const { data: scopedItsNos } = await supabase
//         .from("mumin")
//         .select("its_no")
//         .in("subsector_id", scopedSubsectorIds);
      
//       const filterIds = (scopedItsNos ?? []).map(m => m.its_no);
//       if (filterIds.length > 0) {
//         responseQuery.in("filled_for", filterIds);
//       } else {
//         // If scope has no members, respondents is effectively 0
//         return NextResponse.json({
//           activeForms: activeForms ?? 0,
//           totalMumin: 0,
//           respondedCount: 0,
//           responseRate: 0,
//           membersWithNoProfile: 0,
//           recentImports: recentImports ?? [],
//           overdueForms: overdueForms ?? 0,
//         });
//       }
//     }

//     const { data: responseData } = await responseQuery;
//     const uniqueRespondents = new Set(responseData?.map(r => r.filled_for)).size;

//     const totalMumin = totalMuminCount ?? 0;
//     const membersWithNoProfile = Math.max(0, totalMumin - uniqueRespondents);
//     const responseRate = totalMumin > 0 ? Math.round((uniqueRespondents / totalMumin) * 100) : 0;

//     return NextResponse.json({
//       activeForms: activeForms ?? 0,
//       totalMumin,
//       respondedCount: uniqueRespondents,
//       responseRate,
//       membersWithNoProfile,
//       recentImports: recentImports ?? [],
//       overdueForms: overdueForms ?? 0,
//     });

//   } catch (error: any) {
//     console.error("Overview API Error:", error.message);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }