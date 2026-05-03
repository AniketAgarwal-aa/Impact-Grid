/**
 * ImpactSensei v5.0 - Auth Store
 * Roles: admin | project_manager | client
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/services/api";

export type UserRole = "admin" | "project_manager" | "client";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: number | null;
  department?: string;
  designation?: string;
  avatar_url?: string;
  is_verified: boolean;
  force_password_change?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Helpers
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isPM: () => boolean;
  isClient: () => boolean;
  canApprove: () => boolean;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: Partial<AuthUser> & { password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  refreshAuth: () => Promise<void>;
  setToken: (token: string, refreshToken: string, user: AuthUser) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      isAdmin: () => get().user?.role === "admin",
      isPM: () => get().user?.role === "project_manager",
      isClient: () => get().user?.role === "client",
      canApprove: () =>
        ["admin", "project_manager"].includes(get().user?.role || ""),

      setToken: (token, refreshToken, user) => {
        localStorage.setItem("access_token", token);
        localStorage.setItem("refresh_token", refreshToken);
        set({ token, refreshToken, user, isAuthenticated: true, error: null });
      },

      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.login(email, password, rememberMe);
          get().setToken(data.access_token, data.refresh_token, data.user);
        } catch (err: unknown) {
          const msg = err?.detail || err?.message || "Login failed";
          set({ error: msg });
          throw new Error(msg);
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (formData) => {
        set({ isLoading: true, error: null });
        try {
          await api.register(formData);
        } catch (err: unknown) {
          const msg = err?.detail || err?.message || "Registration failed";
          set({ error: msg });
          throw new Error(msg);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {}
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateProfile: async (data) => {
        const result = await api.updateProfile(data);
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },

      refreshAuth: async () => {
        const rt = get().refreshToken;
        if (!rt) return;
        try {
          const data = await api.refreshToken(rt);
          const me = await api.getMe();
          get().setToken(data.access_token, data.refresh_token, me);
        } catch {
          get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "impactsensei-auth-v5",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
