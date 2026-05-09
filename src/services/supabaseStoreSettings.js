import { supabase } from "../supabaseClient";

const STORE_SETTINGS_ROW_ID = "default";

export async function loadStoreSettingsFromSupabaseService() {
  try {
    const { data, error } = await supabase
      .from("store_settings")
      .select("settings")
      .eq("id", STORE_SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) return { settings: null, error };
    return { settings: data?.settings || null, error: null };
  } catch (error) {
    return { settings: null, error };
  }
}

export async function saveStoreSettingsToSupabaseService(settings) {
  try {
    const { error } = await supabase
      .from("store_settings")
      .upsert(
        {
          id: STORE_SETTINGS_ROW_ID,
          settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    return { error };
  } catch (error) {
    return { error };
  }
}
