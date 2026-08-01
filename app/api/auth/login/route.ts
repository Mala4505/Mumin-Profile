import { NextResponse } from "next/server";
import { createHmac, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const admin = createAdminClient();

function derivePassword(itsNo: string, credential: string): string {
  const secret = process.env.MUMIN_AUTH_SECRET;
  if (!secret) throw new Error("MUMIN_AUTH_SECRET is not set");
  return createHmac("sha256", secret)
    .update(`${itsNo}:${credential}`)
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
      .from("auth_accounts")
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
      .from("auth_accounts")
      .update({ supabase_auth_id: existing.id })
      .eq("its_no", its_no_num);
    return existing;
  }

  console.error("[login] createUser failed:", error);
  return null;
}

// Generic credential failure message — same for all 401 cases to prevent user enumeration
const INVALID_CREDENTIALS_RESPONSE = { error: "Invalid ITS number or PACI number" } as const;

export async function POST(request: Request) {
  try {
    // --- Rate limiting: max 5 failed attempts per IP per 15 minutes ---
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const ipHash = createHash("sha256").update(ip).digest("hex");

    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("attempted_at", windowStart);

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }

    const body = await request.json();

    // Record failed attempt helper (fire-and-forget)
    const recordFailedAttempt = () => {
      admin
        .from("login_attempts")
        .insert({ ip_hash: ipHash })
        .then(() => {
          // Fire-and-forget cleanup of records older than 24 hours
          admin
            .from("login_attempts")
            .delete()
            .lt("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        });
    };

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

    // Single query straight against auth_accounts — no join, no view.
    const { data: row, error: rowError } = await admin
      .from("auth_accounts")
      .select(
        "its_no, sabeel_no, paci_no, default_credential, login_credential, has_custom_password, supabase_auth_id, role, is_active",
      )
      .eq("its_no", its_no_num)
      .maybeSingle();

    if (rowError) {
      console.error("[login] auth_accounts lookup error:", rowError);
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 },
      );
    }

    // User not found — return generic message (prevents ITS enumeration)
    if (!row) {
      recordFailedAttempt();
      return NextResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
    }

    if (!row.is_active) {
      return NextResponse.json(
        { error: "ACCESS_RESTRICTED" },
        { status: 403 },
      );
    }

    const email = `${its_no_raw}@mumin.local`;
    const supabase = await createClient();

    // --- Supabase Auth is the first and, for custom-password users, the only
    // authority. This covers both a user's self-chosen password and an
    // unchanged default one, since the managed flow below keeps the Auth-side
    // password in sync with the default credential.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: paci_no,
    });

    if (!signInError) {
      admin
        .from("auth_accounts")
        .update({ last_login_at: new Date().toISOString() })
        .eq("its_no", its_no_num)
        .then(() => {});
      return NextResponse.json({ success: true });
    }

    // A custom password means Supabase Auth is the sole authority for this
    // user — no default-credential comparison, no password resync. A failed
    // sign-in here is a genuine wrong password (or a missing auth account).
    if (row.has_custom_password) {
      recordFailedAttempt();
      return NextResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
    }

    // Still on the managed/default credential: the Auth-side password may
    // simply be stale (sabeel/paci changed, or never provisioned). Fall back
    // to comparing the typed value against the computed default_credential —
    // this is the only place a wrong-password 401 is decided for these users.
    const expected = (row.default_credential ?? "").trim();
    if (!expected || expected !== paci_no) {
      recordFailedAttempt();
      return NextResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
    }

    const derivedPassword = derivePassword(its_no_raw, expected);

    if (!row.supabase_auth_id) {
      const user = await provisionAuthUser(email, derivedPassword, its_no_num);
      if (!user) {
        return NextResponse.json(
          { error: "Account setup failed. Contact your Masool." },
          { status: 500 },
        );
      }
    } else {
      const { error: updateError } = await admin.auth.admin.updateUserById(
        row.supabase_auth_id,
        { password: derivedPassword },
      );
      if (updateError) {
        console.warn(
          "[login] updateUserById failed (stale id), re-provisioning:",
          updateError.message,
        );
        await admin
          .from("auth_accounts")
          .update({ supabase_auth_id: null })
          .eq("its_no", its_no_num);
        const user = await provisionAuthUser(email, derivedPassword, its_no_num);
        if (!user) {
          return NextResponse.json(
            { error: "Account setup failed. Contact your Masool." },
            { status: 500 },
          );
        }
      }
    }

    // Retry on the same SSR client so cookies get set on this response.
    const { error: retryError } = await supabase.auth.signInWithPassword({
      email,
      password: derivedPassword,
    });

    if (retryError) {
      console.error("[login] retry sign-in failed after resync:", retryError);
      return NextResponse.json(
        { error: "Account setup failed. Contact your Masool." },
        { status: 500 },
      );
    }

    admin
      .from("auth_accounts")
      .update({ last_login_at: new Date().toISOString() })
      .eq("its_no", its_no_num)
      .then(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[login] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
