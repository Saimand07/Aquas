"use client";

import { useCallback, useState } from "react";
import { connectOneAm, type BrowserSession, type MidnightNetwork } from "@/lib/midnight-browser";

type WalletState = {
  connected: boolean;
  connecting: boolean;
  network: MidnightNetwork;
  address: string | null;
  session: BrowserSession | null;
  indexerUri: string | null;
  indexerWsUri: string | null;
  error: string | null;
};

const initialState: WalletState = {
  connected: false,
  connecting: false,
  network: "preview",
  address: null,
  session: null,
  indexerUri: null,
  indexerWsUri: null,
  error: null,
};

export function useMidnightWallet() {
  const [state, setState] = useState(initialState);

  const connect = useCallback(async (targetNetwork: MidnightNetwork = "preview") => {
    setState((current) => ({ ...current, connecting: true, error: null }));
    try {
      const session = await connectOneAm(targetNetwork, "/zk/doctor_license/");
      setState({
        connected: true,
        connecting: false,
        network: targetNetwork,
        address: session.unshieldedAddress,
        session,
        indexerUri: session.config.indexerUri,
        indexerWsUri: session.config.indexerWsUri,
        error: null,
      });
    } catch (error) {
      setState({
        ...initialState,
        network: targetNetwork,
        error: error instanceof Error ? error.message : `Wallet connection on ${targetNetwork} failed.`,
      });
    }
  }, []);

  const disconnect = useCallback(() => setState(initialState), []);
  return { ...state, connect, disconnect };
}
