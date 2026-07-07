const { supabaseAdmin } = require("./config/supabase");

async function checkSupabase() {
  if (!supabaseAdmin) {
    console.log("Supabase not configured.");
    return;
  }
  const { data, error } = await supabaseAdmin.from("documents").select("*").limit(1);
  if (error) {
    console.error("Error accessing documents table:", error.message);
  } else {
    console.log("Documents table exists and accessible. Data:", data);
  }
}

checkSupabase();
