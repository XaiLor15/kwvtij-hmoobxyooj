// Auth provider backed by Supabase Auth + public.user_roles.
// Hooks and types live in `auth-context.ts`; access rules in `permissions-core.ts`.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthContext,
  GUEST_SESSION,
  type AuthCtx,
  type AuthResult,
  type Session,
} from "@/lib/auth-context";
import { setRoleMirror, type Role } from "@/lib/permissions-core";

/**
 * Highest role for a user. A signed-in user without a readable role row is
 * treated as a guest (read-only) rather than silently granted write access.
 */
async function resolveRole(userId: string): Promise<Role> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error || !data) {
    console.error("resolveRole failed", error);
    return "guest";
  }
  if (data.some((r) => r.role === "admin")) return "admin";
  if (data.some((r) => r.role === "member")) return "member";
  return "guest";
}

function displayName(meta: unknown, email?: string | null): string | undefined {
  const m = meta as { display_name?: string; full_name?: string } | null;
  return m?.display_name || m?.full_name || email || undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(GUEST_SESSION);

  useEffect(() => {
    let alive = true;
    const apply = async (
      user: { id: string; email?: string | null; user_metadata: unknown } | null,
    ) => {
      if (!user) {
        setRoleMirror("guest");
        if (alive) setSession({ role: "guest", ready: true });
        return;
      }
      const role = await resolveRole(user.id);
      setRoleMirror(role);
      if (alive)
        setSession({
          role,
          ready: true,
          userId: user.id,
          email: user.email ?? undefined,
          name: displayName(user.user_metadata, user.email),
        });
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      // Defer the role query out of the auth callback (avoids an auth-client deadlock).
      setTimeout(() => void apply(sess?.user ?? null), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true };
  }, []);

  const signup = useCallback(
    async (email: string, password: string, name?: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: name ? { display_name: name.trim() } : undefined,
        },
      });
      return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true };
    },
    [],
  );

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const { lovable } = await import("@/integrations/lovable");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const msg = (result.error as { message?: string }).message;
        return { ok: false, error: msg ?? "ເຂົ້າລະບົບດ້ວຍ Google ບໍ່ສຳເລັດ" };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "ເຂົ້າລະບົບດ້ວຍ Google ບໍ່ສຳເລັດ" };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setRoleMirror("guest");
    setSession({ role: "guest", ready: true });
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ session, login, signup, loginWithGoogle, logout }),
    [session, login, signup, loginWithGoogle, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function translateAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ";
  if (/email not confirmed/i.test(msg)) return "ກະລຸນາຢືນຢັນອີເມວກ່ອນເຂົ້າລະບົບ";
  if (/already registered/i.test(msg)) return "ອີເມວນີ້ຖືກລົງທະບຽນແລ້ວ";
  if (/password/i.test(msg) && /6/.test(msg)) return "ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ";
  return msg;
}
