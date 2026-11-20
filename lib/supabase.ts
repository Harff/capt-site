import { createClient } from "@supabase/supabase-js";

// Clé « publishable » : prévue pour être utilisée dans le navigateur.
// La sécurité repose sur les règles d'accès (RLS) définies dans la base.
// Ces deux valeurs se renseignent dans Vercel (Settings > Environment Variables). Voir le guide.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (voir le guide, étape Vercel).");
}

export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Limite du forfait gratuit Supabase */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
