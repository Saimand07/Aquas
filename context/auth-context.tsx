"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { connectOneAm, type MidnightNetwork, getNetworkConfig } from "@/lib/midnight-browser";

export type AuthType = "wallet" | "credentials" | "sandbox" | null;

export interface AuthUser {
  name: string;
  role: string;
  identifier: string;
  stateAuthority?: string;
  network: MidnightNetwork | "sandbox";
}

export interface AuthContextType {
  isAuthenticated: boolean;
  authType: AuthType;
  user: AuthUser | null;
  walletAddress: string | null;
  currentNetwork: MidnightNetwork;
  isConnecting: boolean;
  error: string | null;
  switchNetwork: (network: MidnightNetwork) => void;
  connectWallet: (targetNetwork?: MidnightNetwork) => Promise<boolean>;
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
const NETWORK_KEY = "aquas_selected_network";

function getInitialNetwork(): MidnightNetwork {
  if (typeof window === "undefined") return "preview";
  try {
    const saved = localStorage.getItem(NETWORK_KEY);
    if (saved === "preprod" || saved === "preview") return saved;
  } catch {
    // ignore
  }
  return "preview";
}

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
  const [currentNetwork, setCurrentNetwork] = useState<MidnightNetwork>(getInitialNetwork);
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

  const switchNetwork = useCallback((network: MidnightNetwork) => {
    setCurrentNetwork(network);
    if (typeof window !== "undefined") {
      localStorage.setItem(NETWORK_KEY, network);
    }
    // Update user network if logged in
    setSession((prev) => {
      if (prev.user) {
        const netConfig = getNetworkConfig(network);
        const updatedUser: AuthUser = {
          ...prev.user,
          network,
          stateAuthority: `${netConfig.name} Shielded Ledger`,
        };
        const updatedSession = { ...prev, user: updatedUser };
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
        }
        return updatedSession;
      }
      return prev;
    });
  }, []);

  const connectWallet = useCallback(async (targetNetwork?: MidnightNetwork): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);
    const networkToUse = targetNetwork || currentNetwork;
    try {
      const sess = await connectOneAm(networkToUse, "/zk/doctor_license/");
      const addr = sess.unshieldedAddress;
      const netConfig = getNetworkConfig(networkToUse);
      const walletUser: AuthUser = {
        name: `Node ${addr.slice(0, 6)}…${addr.slice(-4)}`,
        role: `1AM Authenticated Node (${netConfig.badge})`,
        identifier: addr,
        stateAuthority: `${netConfig.name} Shielded Ledger`,
        network: networkToUse,
      };
      setCurrentNetwork(networkToUse);
      if (typeof window !== "undefined") {
        localStorage.setItem(NETWORK_KEY, networkToUse);
      }
      saveSession(true, "wallet", walletUser, addr);
      setIsConnecting(false);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to connect 1AM wallet on ${networkToUse}. Ensure 1AM is set to ${networkToUse}.`;
      setError(msg);
      setIsConnecting(false);
      return false;
    }
  }, [currentNetwork, saveSession]);

  const signInCredentials = useCallback(async (email: string): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const netConfig = getNetworkConfig(currentNetwork);
    const credUser: AuthUser = {
      name: email.split("@")[0].toUpperCase() + " (Medical Officer)",
      role: "Board Verifier (Attestation Officer)",
      identifier: "AUTH-GOV-99214",
      stateAuthority: `${netConfig.name} Shielded Ledger`,
      network: currentNetwork,
    };
    saveSession(true, "credentials", credUser, null);
    setIsConnecting(false);
    return true;
  }, [currentNetwork, saveSession]);

  const signInSandbox = useCallback(() => {
    const netConfig = getNetworkConfig(currentNetwork);
    saveSession(true, "sandbox", { ...DEMO_USER, network: currentNetwork, stateAuthority: `${netConfig.name} Sandbox` }, "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74");
  }, [currentNetwork, saveSession]);

  const signOut = useCallback(() => {
    saveSession(false, null, null, null);
    setError(null);
  }, [saveSession]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: session.isAuthenticated,
        authType: session.authType,
        user: session.user,
        walletAddress: session.walletAddress,
        currentNetwork,
        isConnecting,
        error,
        switchNetwork,
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
