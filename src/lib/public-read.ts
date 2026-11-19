// Helpers for reading data as a guest (anon) without touching sensitive columns.
// Sensitive columns (phone, address, birthdate, private notes, all finance rows)
// are not readable by anon at the database level, so guests must read the
// public-safe column lists instead of `select("*")`.
import { supabase } from "@/integrations/supabase/client";

export const MEMBERS_PUBLIC_COLUMNS =
  "id,name,nickname,gender,age,gen,role,branch,village,district,province,status,photo,parent_id,category,position,created_at";

export const ELDERS_PUBLIC_COLUMNS =
  "id,name,age,branch,photo,member_id,created_at,position,bio,department,display_order,active,person_type,updated_at";

export const LEADERSHIP_PUBLIC_COLUMNS =
  "id,name,position,branch,photo,bio,member_id,created_at,department,display_order,active,person_type,updated_at";

export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  } catch {
    return false;
  }
}

/** Returns "*" for signed-in users, the public-safe column list for guests. */
export async function readColumns(publicColumns: string): Promise<string> {
  return (await isAuthenticated()) ? "*" : publicColumns;
}
