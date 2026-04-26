const { supabaseAdmin } = require("../db/supabaseAdmin");

async function listNotifications(userAddress) {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_address", userAddress.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

module.exports = {
  listNotifications,
};
