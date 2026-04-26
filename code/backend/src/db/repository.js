const { supabaseAdmin } = require("./supabaseAdmin");

async function insertOne(table, payload) {
  const { data, error } = await supabaseAdmin.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

async function updateOne(table, match, payload) {
  const query = supabaseAdmin.from(table).update(payload);
  Object.entries(match).forEach(([key, value]) => query.eq(key, value));
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

async function findOne(table, match) {
  const query = supabaseAdmin.from(table).select("*");
  Object.entries(match).forEach(([key, value]) => query.eq(key, value));
  const { data, error } = await query.single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

module.exports = {
  insertOne,
  updateOne,
  findOne,
};
