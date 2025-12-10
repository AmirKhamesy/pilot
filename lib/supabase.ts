import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lkritpacjsmjypbiegen.supabase.co";
const supabasePublishableKey = "sb_publishable_Yl3HJqmO6rQuCXkVQLpqWw_Z3kKozOV";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
