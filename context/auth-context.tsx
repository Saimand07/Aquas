"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { connectOneAmPreview } from "@/lib/midnight-browser";

export type AuthType = "wallet" | "credentials" | "sandbox" | null;

export interface AuthUser {
  name: string;
  role: string;
  identifier: string;
  stateAuthority?: string;
  network: "preview" | "preprod" | "sandbox";
}

export interface AuthContextType {
  isAuthenticated: boolean;
  authType: AuthType;
  user: AuthUser | null;
  walletAddress: string | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<boolean>;
  signInCredentials: (email: string, password: string) => Promise<boolean>;
  signInSandbox: () => void;
  signOut: () => void;
}

const DEMO_USER: AuthUser = {
  name: "Dr. Sarah Lin, MD",
  role: "Licensed Physician (Internal Medicine)",
  identifier: "NYS-MB-2024-89102",
  stateAuthority: "New York State Medical Board",
  network: "preview",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "aquas_auth_session";

function getInitialSession(): {
  isAuthenticated: boolean;
  authType: AuthType;
  user: AuthUser | null;
  walletAddress: string | null;
} {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, authType: null, user: null, walletAddress: null };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.isAuthenticated) {
        return {
          isAuthenticated: true,
          authType: data.authType,
          user: data.user,
          walletAddress: data.walletAddress || null,
        };
      }
    }
  } catch {
    // ignore parsing errors
  }
  return { isAuthenticated: false, authType: null, user: null, walletAddress: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState(getInitialSession);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const saveSession = useCallback((authenticated: boolean, type: AuthType, usr: AuthUser | null, address: string | null) => {
    const nextSession = {
      isAuthenticated: authenticated,
      authType: type,
      user: usr,
      walletAddress: address,
    };
    setSession(nextSession);
    if (typeof window !== "undefined") {
      if (authenticated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);
    try {
      const sess = await connectOneAmPreview("/zk/doctor_license/");
      const addr = sess.unshieldedAddress;
      const walletUser: AuthUser = {
        name: `Node ${addr.slice(0, 6)}…${addr.slice(-4)}`,
        role: "1AM Authenticated Physician",
        identifier: addr,
        stateAuthority: "Midnight Preview Shielded Ledger",
        network: "preview",
      };
      saveSession(true, "wallet", walletUser, addr);
      setIsConnecting(false);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect 1AM wallet. Ensure 1AM extension is installed and preview network selected.";
      setError(msg);
      setIsConnecting(false);
      return false;
    }
  }, [saveSession]);

  const signInCredentials = useCallback(async (email: string): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const credUser: AuthUser = {
      name: email.split("@")[0].toUpperCase() + " (Medical Officer)",
      role: "Verified Health System Administrator",
      identifier: `EHR-AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
      stateAuthority: "Interstate Medical Compact Federation",
      network: "preview",
    };
    saveSession(true, "credentials", credUser, "0x7a99f4c39021e8d7");
    setIsConnecting(false);
    return true;
  }, [saveSession]);

  const signInSandbox = useCallback(() => {
    saveSession(true, "sandbox", DEMO_USER, "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74");
  }, [saveSession]);

  const signOut = useCallback(() => {
    saveSession(false, null, null, null);
    setError(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("midnight-wallet-disconnect"));
    }
  }, [saveSession]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: session.isAuthenticated,
        authType: session.authType,
        user: session.user,
        walletAddress: session.walletAddress,
        isConnecting,
        error,
        connectWallet,
        signInCredentials,
        signInSandbox,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
