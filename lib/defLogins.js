import { createAdminClient } from "./supabase/admin"; // adjust path if needed

async function backfillAuthIds() {
  const supabase = createAdminClient();

  // Step 1: Run the join query directly to get ITS + PACI for missing users
  const { data: rows, error } = await supabase.rpc("get_missing_auth_ids");

  if (error) {
    console.error("Error fetching ITS + PACI:", error);
    return;
  }

  for (const row of rows ?? []) {
    const email = `${row.its_no}@mumin.local`;
    const password = String(row.paci_no).trim();

    // Step 2: Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`Failed to create user for ITS ${row.its_no}:`, authError);
      continue;
    }

    // Step 3: Update mumin record with supabase_auth_id
    const { error: updateError } = await supabase
      .from("mumin")
      .update({ supabase_auth_id: authUser.user.id })
      .eq("its_no", row.its_no);

    if (updateError) {
      console.error(`Failed to update ITS ${row.its_no}:`, updateError);
    } else {
      console.log(`Provisioned ITS ${row.its_no} with auth_id ${authUser.user.id}`);
    }
  }
}

backfillAuthIds();
