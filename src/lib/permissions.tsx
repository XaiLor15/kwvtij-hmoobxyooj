// Centralized permission / RBAC layer, backed by Supabase Auth + user_roles.
//
// Roles come from public.user_roles:
//   - "admin"  → full access
//   - "member" → full access (same effective permissions as admin here)
//   - "guest"  → not signed in; read-only across the site EXCEPT can edit members
//
// Kept the same public surface (AuthProvider, useAuth, usePermissions,
// assertPermission, canX helpers) so no component needs to change.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Role = "guest" | "member" | "admin";
export type Module =
  | "members"
  | "leadership"
  | "elders"
  | "activities"
  | "finance"
  | "fund"
  | "news"
  | "statistics"
  | "comments"
  | "dashboard";

interface Session {
  role: Role;
  name?: string;
  email?: string;
  userId?: string;
}

const DEFAULT_GUEST: Session = { role: "guest" };

// Mirror of the current session for use in synchronous places
// (assertPermission is called from store code paths that can't be async).
let currentRoleMirror: Role = "guest";
function setRoleMirror(r: Role) {
  currentRoleMirror = r;
  if (typeof document !== "undefined") document.body.setAttribute("data-role", r);
}

interface AuthCtx {
  session: Session;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

async function resolveRole(userId: string): Promise<Role> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error || !data) return "member";
  if (data.some((r) => r.role === "admin")) return "admin";
  if (data.some((r) => r.role === "member")) return "member";
  return "member";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(DEFAULT_GUEST);

  useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (mounted) {
          setSession(DEFAULT_GUEST);
          setRoleMirror("guest");
        }
        return;
      }
      const role = await resolveRole(user.id);
      const s: Session = {
        role,
        userId: user.id,
        email: user.email ?? undefined,
        name: (user.user_metadata as any)?.display_name ?? user.email ?? undefined,
      };
      if (mounted) {
        setSession(s);
        setRoleMirror(role);
      }
    }
    loadInitial();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess?.user) {
        setSession(DEFAULT_GUEST);
        setRoleMirror("guest");
        return;
      }
      // Defer role fetch to avoid deadlocking inside the auth callback
      setTimeout(async () => {
        const user = sess.user;
        const role = await resolveRole(user.id);
        setSession({
          role,
          userId: user.id,
          email: user.email ?? undefined,
          name: (user.user_metadata as any)?.display_name ?? user.email ?? undefined,
        });
        setRoleMirror(role);
      }, 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const { lovable } = await import("@/integrations/lovable");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error)
        return { ok: false, error: (result.error as any).message ?? "Google sign-in failed" };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Google sign-in failed" };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(DEFAULT_GUEST);
    setRoleMirror("guest");
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ session, login, signup, loginWithGoogle, logout }),
    [session, login, signup, loginWithGoogle, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      session: DEFAULT_GUEST,
      login: async () => ({ ok: false, error: "AuthProvider missing" }),
      signup: async () => ({ ok: false, error: "AuthProvider missing" }),
      loginWithGoogle: async () => ({ ok: false, error: "AuthProvider missing" }),
      logout: async () => {},
    };
  }
  return ctx;
}

// ---------- Permission helpers ----------
export function isGuestUser(role: Role): boolean {
  return role === "guest";
}
export function isAuthenticatedUser(role: Role): boolean {
  return role === "admin" || role === "member";
}
export function isAdmin(role: Role): boolean {
  return role === "admin";
}

export function canViewPage(_role: Role, _page: string): boolean {
  return true;
}
export function canViewDetails(_role: Role, _module: Module): boolean {
  return true;
}
export function canCreate(role: Role, _module: Module): boolean {
  return isAuthenticatedUser(role);
}
export function canDelete(role: Role, _module: Module): boolean {
  return isAuthenticatedUser(role);
}
export function canEdit(role: Role, module: Module): boolean {
  if (isAuthenticatedUser(role)) return true;
  if (role === "guest" && module === "members") return true;
  return false;
}
export function canManage(role: Role, _module: Module): boolean {
  return isAdmin(role);
}
export function canShowQuickActions(role: Role): boolean {
  return isAuthenticatedUser(role);
}
export function canGuestEditMember(role: Role): boolean {
  return canEdit(role, "members");
}

export function usePermissions() {
  const { session } = useAuth();
  const role = session.role;
  return useMemo(
    () => ({
      role,
      session,
      isGuest: isGuestUser(role),
      isAuthenticated: isAuthenticatedUser(role),
      isAdmin: isAdmin(role),
      canView: (m: Module) => canViewDetails(role, m),
      canCreate: (m: Module) => canCreate(role, m),
      canEdit: (m: Module) => canEdit(role, m),
      canDelete: (m: Module) => canDelete(role, m),
      canManage: (m: Module) => canManage(role, m),
      canShowQuickActions: () => canShowQuickActions(role),
    }),
    [role, session],
  );
}

// Sync guard used by store mutations. Reads from the module-level role mirror
// (kept in sync by AuthProvider). RLS in the database is the real source of truth.
export function assertPermission(action: "create" | "edit" | "delete", module: Module): boolean {
  const role = currentRoleMirror;
  const ok =
    action === "create"
      ? canCreate(role, module)
      : action === "edit"
        ? canEdit(role, module)
        : canDelete(role, module);
  if (!ok) {
    try {
      toast.error("ທ່ານບໍ່ມີສິດດຳເນີນການນີ້");
    } catch {
      /* noop */
    }
  }
  return ok;
}
