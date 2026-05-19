import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();

function derivePassword(itsNo: string, paciNo: string): string {
  const secret = process.env.MUMIN_AUTH_SECRET;
  if (!secret) throw new Error("MUMIN_AUTH_SECRET is not set");
  return createHmac("sha256", secret)
    .update(`${itsNo}:${paciNo}`)
    .digest("hex");
}

async function provisionAuthUser(
  email: string,
  password: string,
  its_no_num: number,
) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && created.user) {
    await admin
      .from("mumin")
      .update({ supabase_auth_id: created.user.id })
      .eq("its_no", its_no_num);
    return created.user;
  }

  if (error?.code === "email_exists") {
    console.warn(
      "[login] email already exists, searching and re-linking:",
      email,
    );
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users?.find((u) => u.email === email);

    if (!existing) {
      console.error("[login] email_exists but could not find user in list");
      return null;
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(
      existing.id,
      { password },
    );
    if (updateErr) {
      console.error("[login] failed to update existing auth user:", updateErr);
      return null;
    }

    await admin
      .from("mumin")
      .update({ supabase_auth_id: existing.id })
      .eq("its_no", its_no_num);
    return existing;
  }

  console.error("[login] createUser failed:", error);
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const its_no_raw: string = String(body.its_no ?? "").trim();
    const paci_no: string = String(body.paci_no ?? "").trim();

    if (!its_no_raw || !paci_no) {
      return NextResponse.json(
        { error: "ITS No and Password are required" },
        { status: 400 },
      );
    }

    const its_no_num = Number(its_no_raw);
    if (isNaN(its_no_num)) {
      return NextResponse.json({ error: "Invalid ITS No" }, { status: 400 });
    }

    // Single query — replaces mumin lookup + family lookup
    const { data: row, error: rowError } = await admin
      .from("mumin_auth")
      .select("its_no, sabeel_no, supabase_auth_id, is_active, paci_no")
      .eq("its_no", its_no_num)
      .maybeSingle();

    if (rowError) {
      console.error("[login] mumin_auth lookup error:", rowError);
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 },
      );
    }
    if (!row) {
      return NextResponse.json({ error: "ITS No not found" }, { status: 401 });
    }

    if (!row.is_active) {
      return NextResponse.json(
        { error: "ACCESS_RESTRICTED" },
        { status: 403 },
      );
    }

    if (!row.paci_no) {
      return NextResponse.json(
        { error: "No house record found for this family" },
        { status: 401 },
      );
    }
    if (row.paci_no !== paci_no) {
      return NextResponse.json(
        { error: "Invalid PACI number" },
        { status: 401 },
      );
    }

    const email = `${its_no_raw}@mumin.local`;
    const password = derivePassword(its_no_raw, paci_no);

    if (!row.supabase_auth_id) {
      const user = await provisionAuthUser(email, password, its_no_num);
      if (!user) {
        return NextResponse.json(
          { error: "Account setup failed. Contact your Masool." },
          { status: 500 },
        );
      }
    } else {
      const { error: updateError } = await admin.auth.admin.updateUserById(
        row.supabase_auth_id,
        { password },
      );
      if (updateError) {
        console.warn(
          "[login] updateUserById failed (stale id), re-provisioning:",
          updateError.message,
        );
        await admin
          .from("mumin")
          .update({ supabase_auth_id: null })
          .eq("its_no", its_no_num);
        const user = await provisionAuthUser(email, password, its_no_num);
        if (!user) {
          return NextResponse.json(
            { error: "Account setup failed. Contact your Masool." },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ email, password });
  } catch (err) {
    console.error("[login] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
