import { createContext, useContext, useMemo } from "react";
import { can, type Action, type Module, type Role } from "@/lib/permissions-core";

export interface Session {
  role: Role;
  name?: string;
  email?: string;
  userId?: string;
  /** False until the initial session check has finished. */
  ready: boolean;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export interface AuthCtx {
  session: Session;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
}

export const GUEST_SESSION: Session = { role: "guest", ready: false };

export const AuthContext = createContext<AuthCtx | null>(null);

const missing = async (): Promise<AuthResult> => ({ ok: false, error: "AuthProvider missing" });

export function useAuth(): AuthCtx {
  return (
    useContext(AuthContext) ?? {
      session: GUEST_SESSION,
      login: missing,
      signup: missing,
      loginWithGoogle: missing,
      logout: async () => {},
    }
  );
}

export function usePermissions() {
  const { session } = useAuth();
  const role = session.role;
  return useMemo(
    () => ({
      role,
      session,
      isGuest: role === "guest",
      isAuthenticated: role !== "guest",
      isAdmin: role === "admin",
      can: (action: Action, module: Module) => can(role, action, module),
      canCreate: (m: Module) => can(role, "create", m),
      canEdit: (m: Module) => can(role, "edit", m),
      canDelete: (m: Module) => can(role, "delete", m),
      canView: (m: Module) => can(role, "view", m),
    }),
    [role, session],
  );
}
