/**
 * usePosition — React hook for reading and polling user position state.
 *
 * Fetches the user's on-chain UserPosition account and the ProtocolState.
 * Automatically refetches after transactions.
 */

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram, fetchPosition, fetchProtocolState } from "../lib/program";
import { formatCiphertext } from "../lib/arcium";

export function usePosition() {
  useConnection();
  const wallet = useWallet();

  const [position, setPosition] = useState(null);
  const [protocolState, setProtocolState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setPosition(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { program } = getProgram(wallet);

      const [pos, proto] = await Promise.all([
        fetchPosition(program, wallet.publicKey),
        fetchProtocolState(program),
      ]);

      if (pos) {
        setPosition({
          ...pos,
          // Helpers for display
          hasCollateral: pos.collateralCiphertext?.some((b) => b !== 0),
          hasBorrow: pos.borrowCiphertext?.some((b) => b !== 0),
          collateralHex: formatCiphertext(pos.collateralCiphertext),
          borrowHex: formatCiphertext(pos.borrowCiphertext),
          ownerStr: pos.owner?.toBase58(),
        });
      } else {
        setPosition(null);
      }

      if (proto) {
        setProtocolState({
          ...proto,
          totalDepositsSOL: Number(proto.totalDeposits) / 1e9,
          totalBorrowsSOL: Number(proto.totalBorrows) / 1e9,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to fetch position");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  // Fetch on wallet connect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [wallet.connected, wallet.publicKey, refresh]);

  return {
    position,
    protocolState,
    loading,
    error,
    refresh,
    hasPosition: !!position,
  };
}
