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
import { LIQ_THRESHOLD_BPS, MAX_LTV_BPS } from "../lib/constants";

function anchorNumberToNumber(value) {
  if (value === null || value === undefined) return 0;
  const raw = typeof value.toString === "function" ? value.toString() : value;
  return Number(raw);
}

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
        const collateralLamports = anchorNumberToNumber(pos.collateralLamports);
        const borrowLamports = anchorNumberToNumber(pos.borrowLamports);
        const ltvBps = collateralLamports > 0
          ? Math.floor((borrowLamports * 10_000) / collateralLamports)
          : 0;
        const maxBorrowLamports = Math.floor((collateralLamports * Number(MAX_LTV_BPS)) / 10_000);
        const availableBorrowLamports = Math.max(0, maxBorrowLamports - borrowLamports);
        const healthFactor = borrowLamports > 0
          ? ((collateralLamports * Number(LIQ_THRESHOLD_BPS)) / 10_000) / borrowLamports
          : Infinity;

        setPosition({
          ...pos,
          // Helpers for display
          hasCollateral: pos.collateralCiphertext?.some((b) => b !== 0),
          hasBorrow: pos.borrowCiphertext?.some((b) => b !== 0),
          collateralLamportsNumber: collateralLamports,
          borrowLamportsNumber: borrowLamports,
          ltvBps,
          availableBorrowLamports,
          healthFactor,
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
          totalDepositsSOL: anchorNumberToNumber(proto.totalDeposits) / 1e9,
          totalBorrowsSOL: anchorNumberToNumber(proto.totalBorrows) / 1e9,
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
