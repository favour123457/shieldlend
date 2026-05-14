/**
 * useShieldLend — Main hook wiring UI to the ShieldLend program + Arcium MPC.
 *
 * Since the on-chain program currently has the 3 MPC circuits only,
 * this hook handles:
 *   - Client-side encryption of amounts (x25519 + RescueCipher)
 *   - Calling validateBorrow MPC circuit before any borrow
 *   - Calling checkLiquidatable MPC circuit for health checks
 *   - Listening for on-chain callback events and decrypting results
 */

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getProgram,
  getArciumAccounts,
  getCompDefAddress,
  getVaultAddress,
  getProtocolAddress,
  getPositionAddress,
  fetchPosition,
} from "../lib/program";
import {
  encryptAmount,
  encryptValues,
  decryptResult,
  getMXEPubkey,
  waitForComputation,
  randomComputationOffset,
} from "../lib/arcium";
import { PROGRAM_ID } from "../lib/constants";

// Local encrypted state (in-memory for demo — replace with on-chain PDA when available)
let localPosition = {
  collateralLamports: 0n,
  borrowLamports: 0n,
  collateralCipher: null,  // { ciphertext, nonce, privateKey, publicKey, sharedSecret }
  borrowCipher: null,
};

function anchorNumberToBigInt(value) {
  if (value === null || value === undefined) return 0n;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (typeof value.toString === "function") return BigInt(value.toString());
  return 0n;
}

function waitForProgramEvent(program, eventName, log, timeoutMs = 120_000) {
  let listener = null;
  let timeout = null;

  const cleanup = () => {
    if (timeout) clearTimeout(timeout);
    if (listener !== null) {
      Promise.resolve(program.removeEventListener(listener)).catch((err) => {
        log("Failed to remove Anchor event listener", {
          eventName,
          listener,
          error: err.message,
        });
      });
    }
  };

  const promise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for ${eventName} (${timeoutMs / 1000}s)`));
    }, timeoutMs);

    try {
      listener = program.addEventListener(eventName, (event) => {
        cleanup();
        log(`Received ${eventName}`, {
          nonce: Array.from(event.nonce || []),
          resultPreview: Array.from(event.result || []).slice(0, 8),
        });
        resolve(event);
      });
      log(`Listening for ${eventName}`, { listener });
    } catch (err) {
      cleanup();
      reject(err);
    }
  });

  return { promise, cleanup };
}

export function useShieldLend() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [loading, setLoading] = useState(false);
  const [mpcStatus, setMpcStatus] = useState("idle");
  const [mpcElapsed, setMpcElapsed] = useState(0);
  const [lastError, setLastError] = useState(null);

  const log = useCallback((message, details = {}) => {
    console.log(`[ShieldLend] ${message}`, {
      wallet: wallet.publicKey?.toBase58?.() || null,
      rpcEndpoint: connection.rpcEndpoint,
      ...details,
    });
  }, [connection.rpcEndpoint, wallet.publicKey]);

  // ── Timer for MPC elapsed display ─────────────────────────────
  const startElapsedTimer = () => {
    const start = Date.now();
    const id = setInterval(() => setMpcElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  };

  // ── Fetch MXE pubkey ───────────────────────────────────────────
  const getMXEKey = useCallback(async (program) => {
    try {
      log("Fetching Arcium MXE x25519 public key", { programId: PROGRAM_ID });
      const mxeKey = await getMXEPubkey(
        program.provider,
        new PublicKey(PROGRAM_ID)
      );
      log("Fetched Arcium MXE x25519 public key", {
        byteLength: mxeKey?.length,
        preview: Array.from(mxeKey || []).slice(0, 6),
      });
      return mxeKey;
    } catch {
      throw new Error("Could not fetch MXE public key. Is the MXE initialized?");
    }
  }, [log]);

  const loadPositionFromChain = useCallback(async (program) => {
    if (!wallet.publicKey) return null;

    const position = await fetchPosition(program, wallet.publicKey);
    if (position) {
      localPosition.collateralLamports = anchorNumberToBigInt(position.collateralLamports);
      localPosition.borrowLamports = anchorNumberToBigInt(position.borrowLamports);
      localPosition.collateralCipher = {
        ciphertext: position.collateralCiphertext,
      };
      localPosition.borrowCipher = {
        ciphertext: position.borrowCiphertext,
      };
      log("Loaded on-chain ShieldLend position PDA", {
        position: getPositionAddress(PROGRAM_ID, wallet.publicKey).toBase58(),
        collateralLamports: localPosition.collateralLamports.toString(),
        borrowLamports: localPosition.borrowLamports.toString(),
      });
    } else {
      log("No on-chain ShieldLend position PDA found yet", {
        position: getPositionAddress(PROGRAM_ID, wallet.publicKey).toBase58(),
      });
    }
    return position;
  }, [wallet.publicKey, log]);

  // ── Deposit collateral (encrypts + stores locally for demo) ────
  const depositCollateral = useCallback(async (amountSOL) => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");
    setLoading(true);
    setLastError(null);

    try {
      log("Deposit requested", { amountSOL });
      const { program } = getProgram(wallet);
      await loadPositionFromChain(program);
      const balance = await connection.getBalance(wallet.publicKey, "confirmed");
      log("Read wallet balance from Solana RPC", { balanceLamports: balance });

      const mxePublicKey = await getMXEKey(program);
      const lamports = BigInt(Math.floor(amountSOL * 1_000_000_000));
      const newCollateralLamports = localPosition.collateralLamports + lamports;

      setMpcStatus("encrypting");
      const encrypted = await encryptAmount(newCollateralLamports, mxePublicKey);
      log("Encrypted updated collateral total with Arcium RescueCipher", {
        depositLamports: lamports.toString(),
        newCollateralLamports: newCollateralLamports.toString(),
        ciphertextBytes: encrypted.ciphertext.length,
        nonce: encrypted.nonce.toString(),
        ephemeralPubkey: Array.from(encrypted.publicKey),
      });

      const vaultAddress = getVaultAddress(PROGRAM_ID);
      const transferLamports = Number(lamports);
      if (!Number.isSafeInteger(transferLamports)) {
        throw new Error("Deposit amount is too large for a browser-side lamport transfer");
      }
      if (balance < transferLamports) {
        throw new Error("Wallet balance is too low for this deposit");
      }

      if (!program.methods.depositCollateral) {
        throw new Error("The deployed ShieldLend IDL has no deposit_collateral instruction yet. Rebuild/redeploy and copy the new IDL.");
      }

      const protocolAddress = getProtocolAddress(PROGRAM_ID);
      const positionAddress = getPositionAddress(PROGRAM_ID, wallet.publicKey);

      log("Requesting wallet signature for on-chain deposit_collateral", {
        depositor: wallet.publicKey.toBase58(),
        protocol: protocolAddress.toBase58(),
        position: positionAddress.toBase58(),
        vault: vaultAddress.toBase58(),
        depositLamports: lamports.toString(),
        encryptedCollateralTotal: Array.from(encrypted.ciphertext).slice(0, 8),
      });

      const tx = await program.methods
        .depositCollateral(new BN(lamports.toString()), Array.from(encrypted.ciphertext))
        .accountsPartial({
          depositor: wallet.publicKey,
          protocol: protocolAddress,
          position: positionAddress,
          vault: vaultAddress,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      localPosition.collateralLamports = newCollateralLamports;
      localPosition.collateralCipher = encrypted;

      setMpcStatus("done");
      log("On-chain deposit_collateral confirmed", {
        tx,
        vault: vaultAddress.toBase58(),
        position: positionAddress.toBase58(),
        protocol: protocolAddress.toBase58(),
        depositLamports: lamports.toString(),
        newCollateralLamports: newCollateralLamports.toString(),
        availableInstructions: program.idl.instructions.map((ix) => ix.name),
        note: "Program transferred SOL into the vault PDA and updated the user's position PDA.",
      });
      return {
        success: true,
        lamports,
        ciphertext: encrypted.ciphertext,
        publicKey: encrypted.publicKey,
        tx,
        vault: vaultAddress.toBase58(),
        position: positionAddress.toBase58(),
        note: "Encrypted with Arcium, deposited through ShieldLend, and stored in the user's on-chain position PDA.",
      };
    } catch (err) {
      log("Deposit failed", { error: err.message });
      setLastError(err.message);
      setMpcStatus("error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, connection, getMXEKey, loadPositionFromChain, log]);

  // ── Validate borrow via Arcium MPC ────────────────────────────
  const queueBorrowValidation = useCallback(async (borrowSOL) => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    setMpcStatus("encrypting");
    setLastError(null);
    const stopTimer = startElapsedTimer();
    let eventWaiter = null;

    try {
      log("Borrow validation requested", { borrowSOL });
      const { program } = getProgram(wallet);
      await loadPositionFromChain(program);
      if (localPosition.collateralLamports === 0n) throw new Error("No collateral deposited");

      const mxePublicKey = await getMXEKey(program);

      const borrowLamports = BigInt(Math.floor(borrowSOL * 1_000_000_000));
      const existingBorrow = localPosition.borrowLamports;
      const collateral = localPosition.collateralLamports;

      const encryptedInput = await encryptValues(
        [collateral, existingBorrow, borrowLamports],
        mxePublicKey
      );
      const [encCollateral, encExisting, encRequested] = encryptedInput.ciphertexts;
      log("Encrypted validate_borrow inputs", {
        collateralLamports: collateral.toString(),
        existingBorrowLamports: existingBorrow.toString(),
        requestedBorrowLamports: borrowLamports.toString(),
        sharedNonce: encryptedInput.nonce.toString(),
        inputPubkey: Array.from(encryptedInput.publicKey),
      });

      const computationOffset = new BN(randomComputationOffset().toString());
      const accounts = getArciumAccounts(PROGRAM_ID, computationOffset);
      const compDefAccount = getCompDefAddress(PROGRAM_ID, "validate_borrow");

      setMpcStatus("queued");

      const nonceBN = new BN(encryptedInput.nonce.toString());
      eventWaiter = waitForProgramEvent(program, "borrowValidatedEvent", log);

      const tx = await program.methods
        .validateBorrow(
          computationOffset,
          Array.from(encCollateral),
          Array.from(encExisting),
          Array.from(encRequested),
          new BN(75_00), // max_ltv_bps as u64 plaintext (75%)
          Array.from(encryptedInput.publicKey),
          nonceBN,
        )
        .accountsPartial({
          payer: wallet.publicKey,
          signPdaAccount: accounts.signPdaAccount,
          computationAccount: accounts.computationAccount,
          clusterAccount: accounts.clusterAccount,
          mxeAccount: accounts.mxeAccount,
          mempoolAccount: accounts.mempoolAccount,
          executingPool: accounts.executingPool,
          poolAccount: accounts.poolAccount,
          clockAccount: accounts.clockAccount,
          compDefAccount,
          arciumProgram: accounts.arciumProgram,
        })
        .rpc({ commitment: "confirmed" });
      log("Queued validate_borrow on Solana", {
        tx,
        computationOffset: computationOffset.toString(),
      });

      setMpcStatus("computing");

      log("Waiting for Arcium computation finalization", {
        computationOffset: computationOffset.toString(),
      });
      await waitForComputation(
        program.provider,
        computationOffset,
        new PublicKey(PROGRAM_ID),
        () => setMpcStatus("timeout_warning")
      );
      log("Arcium computation finalized", {
        computationOffset: computationOffset.toString(),
      });

      const result = await eventWaiter.promise;

      const isValid = decryptResult(result.result, result.nonce, encryptedInput.sharedSecret) === 1n;
      log("Decrypted validate_borrow result", { isValid });

      stopTimer();
      setMpcStatus("done");

      return {
        isValid,
        tx,
        borrowLamports,
        encRequested: {
          ciphertext: encRequested,
          nonce: encryptedInput.nonce,
          nonceBytes: encryptedInput.nonceBytes,
          publicKey: encryptedInput.publicKey,
        },
      };
    } catch (err) {
      eventWaiter?.cleanup();
      log("Borrow validation failed", { error: err.message });
      stopTimer();
      setMpcStatus("error");
      setLastError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, getMXEKey, loadPositionFromChain, log]);

  // ── Finalise borrow payout from the program-controlled vault PDA ─────────
  const finaliseBorrow = useCallback(async (borrowSOL, encRequested) => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const lamports = BigInt(Math.floor(borrowSOL * 1_000_000_000));
    const payoutLamports = Number(lamports);
    if (!Number.isSafeInteger(payoutLamports)) {
      throw new Error("Borrow amount is too large for a browser-side payout request");
    }

    const { program } = getProgram(wallet);
    await loadPositionFromChain(program);
    const vaultAddress = getVaultAddress(PROGRAM_ID);

    if (!program.methods.borrowPayout) {
      log("No borrow_payout instruction found in the deployed ShieldLend IDL", {
        borrowSOL,
        borrowLamports: lamports.toString(),
        vault: vaultAddress.toBase58(),
        note: "Rebuild/redeploy the Anchor program and copy the updated IDL before the frontend can transfer SOL back from the vault PDA.",
      });

      localPosition.borrowLamports += lamports;
      localPosition.borrowCipher = encRequested;
      return null;
    }

    const mxePublicKey = await getMXEKey(program);
    const newBorrowLamports = localPosition.borrowLamports + lamports;
    const encryptedBorrowTotal = await encryptAmount(newBorrowLamports, mxePublicKey);
    const protocolAddress = getProtocolAddress(PROGRAM_ID);
    const positionAddress = getPositionAddress(PROGRAM_ID, wallet.publicKey);

    const vaultBalance = await connection.getBalance(vaultAddress, "confirmed");
    log("Preparing borrow payout from ShieldLend vault PDA", {
      borrowSOL,
      borrowLamports: lamports.toString(),
      newBorrowLamports: newBorrowLamports.toString(),
      vault: vaultAddress.toBase58(),
      protocol: protocolAddress.toBase58(),
      position: positionAddress.toBase58(),
      vaultBalanceLamports: vaultBalance,
      validatedRequestedCipherPreview: Array.from(encRequested?.ciphertext || []).slice(0, 8),
      storedBorrowCipherPreview: Array.from(encryptedBorrowTotal.ciphertext).slice(0, 8),
    });

    if (vaultBalance < payoutLamports) {
      throw new Error("ShieldLend vault balance is too low for this borrow payout");
    }

    const tx = await program.methods
      .borrowPayout(new BN(lamports.toString()), Array.from(encryptedBorrowTotal.ciphertext))
      .accountsPartial({
        borrower: wallet.publicKey,
        protocol: protocolAddress,
        position: positionAddress,
        vault: vaultAddress,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    localPosition.borrowLamports = newBorrowLamports;
    localPosition.borrowCipher = encryptedBorrowTotal;
    log("Borrow payout transferred SOL from vault PDA", {
      tx,
      borrowSOL,
      borrowLamports: lamports.toString(),
      newBorrowLamports: newBorrowLamports.toString(),
      vault: vaultAddress.toBase58(),
      position: positionAddress.toBase58(),
    });
    return tx;
  }, [wallet, connection, getMXEKey, loadPositionFromChain, log]);

  // ── Check liquidatable via Arcium MPC ─────────────────────────
  const checkLiquidatable = useCallback(async (targetAddress) => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    setMpcStatus("encrypting");
    setLastError(null);
    const stopTimer = startElapsedTimer();
    let eventWaiter = null;

    try {
      log("Liquidation check requested", { targetAddress });
      const { program } = getProgram(wallet);
      const mxePublicKey = await getMXEKey(program);

      let collateral = localPosition.collateralLamports || 1_000_000_000n;
      let borrow = localPosition.borrowLamports || 0n;
      const targetPosition = await fetchPosition(program, targetAddress);
      if (targetPosition) {
        collateral = anchorNumberToBigInt(targetPosition.collateralLamports);
        borrow = anchorNumberToBigInt(targetPosition.borrowLamports);
        log("Loaded target on-chain ShieldLend position PDA for liquidation check", {
          targetAddress,
          position: getPositionAddress(PROGRAM_ID, targetAddress).toBase58(),
          collateralLamports: collateral.toString(),
          borrowLamports: borrow.toString(),
        });
      }

      const encryptedInput = await encryptValues([collateral, borrow], mxePublicKey);
      const [encCollateral, encBorrow] = encryptedInput.ciphertexts;
      log("Encrypted check_liquidatable inputs", {
        targetAddress,
        collateralLamports: collateral.toString(),
        borrowLamports: borrow.toString(),
        sharedNonce: encryptedInput.nonce.toString(),
        inputPubkey: Array.from(encryptedInput.publicKey),
      });

      const computationOffset = new BN(randomComputationOffset().toString());
      const accounts = getArciumAccounts(PROGRAM_ID, computationOffset);
      const compDefAccount = getCompDefAddress(PROGRAM_ID, "check_liquidatable");

      setMpcStatus("queued");

      const nonceBN = new BN(encryptedInput.nonce.toString());
      eventWaiter = waitForProgramEvent(program, "liquidatableResultEvent", log);

      const tx = await program.methods
        .checkLiquidatable(
          computationOffset,
          Array.from(encCollateral),
          Array.from(encBorrow),
          new BN(80_00), // ltv_threshold_bps as u64 plaintext (80%)
          Array.from(encryptedInput.publicKey),
          nonceBN,
        )
        .accountsPartial({
          payer: wallet.publicKey,
          signPdaAccount: accounts.signPdaAccount,
          computationAccount: accounts.computationAccount,
          clusterAccount: accounts.clusterAccount,
          mxeAccount: accounts.mxeAccount,
          mempoolAccount: accounts.mempoolAccount,
          executingPool: accounts.executingPool,
          poolAccount: accounts.poolAccount,
          clockAccount: accounts.clockAccount,
          compDefAccount,
          arciumProgram: accounts.arciumProgram,
        })
        .rpc({ commitment: "confirmed" });
      log("Queued check_liquidatable on Solana", {
        tx,
        computationOffset: computationOffset.toString(),
      });

      setMpcStatus("computing");

      log("Waiting for Arcium computation finalization", {
        computationOffset: computationOffset.toString(),
      });
      await waitForComputation(
        program.provider,
        computationOffset,
        new PublicKey(PROGRAM_ID),
        () => setMpcStatus("timeout_warning")
      );
      log("Arcium computation finalized", {
        computationOffset: computationOffset.toString(),
      });

      const result = await eventWaiter.promise;

      const isLiquidatable = decryptResult(result.result, result.nonce, encryptedInput.sharedSecret) === 1n;
      log("Decrypted check_liquidatable result", { isLiquidatable });

      stopTimer();
      setMpcStatus("done");
      return { isLiquidatable, tx };
    } catch (err) {
      eventWaiter?.cleanup();
      log("Liquidation check failed", { error: err.message });
      stopTimer();
      setMpcStatus("error");
      setLastError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, getMXEKey, log]);

  // ── Repay borrow through the on-chain protocol state ──────────
  const repay = useCallback(async (repaySOL) => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    setLastError(null);

    try {
      log("Repay requested", { repaySOL });
      const { program } = getProgram(wallet);
      await loadPositionFromChain(program);

      if (!program.methods.repay) {
        throw new Error("The deployed ShieldLend IDL has no repay instruction yet. Rebuild/redeploy and copy the new IDL.");
      }

      const lamports = BigInt(Math.floor(repaySOL * 1_000_000_000));
      if (lamports <= 0n) throw new Error("Repay amount must be greater than zero");
      if (lamports > localPosition.borrowLamports) throw new Error("Repay amount exceeds borrow");

      const mxePublicKey = await getMXEKey(program);
      const remainingBorrowLamports = localPosition.borrowLamports - lamports;
      const encryptedBorrowTotal = await encryptAmount(remainingBorrowLamports, mxePublicKey);

      const protocolAddress = getProtocolAddress(PROGRAM_ID);
      const positionAddress = getPositionAddress(PROGRAM_ID, wallet.publicKey);
      const vaultAddress = getVaultAddress(PROGRAM_ID);

      log("Requesting wallet signature for on-chain repay", {
        repaySOL,
        repayLamports: lamports.toString(),
        remainingBorrowLamports: remainingBorrowLamports.toString(),
        protocol: protocolAddress.toBase58(),
        position: positionAddress.toBase58(),
        vault: vaultAddress.toBase58(),
        encryptedRemainingBorrowPreview: Array.from(encryptedBorrowTotal.ciphertext).slice(0, 8),
      });

      const tx = await program.methods
        .repay(new BN(lamports.toString()), Array.from(encryptedBorrowTotal.ciphertext))
        .accountsPartial({
          borrower: wallet.publicKey,
          protocol: protocolAddress,
          position: positionAddress,
          vault: vaultAddress,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      localPosition.borrowLamports = remainingBorrowLamports;
      localPosition.borrowCipher = encryptedBorrowTotal;

      log("Repay confirmed on Solana", {
        tx,
        repayLamports: lamports.toString(),
        remainingBorrowLamports: remainingBorrowLamports.toString(),
        position: positionAddress.toBase58(),
        vault: vaultAddress.toBase58(),
      });
      return tx;
    } catch (err) {
      log("Repay failed", { error: err.message });
      setLastError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, getMXEKey, loadPositionFromChain, log]);

  // ── Get local position for display ────────────────────────────
  const getLocalPosition = useCallback(() => ({
    collateralLamports: localPosition.collateralLamports,
    borrowLamports: localPosition.borrowLamports,
    hasCollateral: localPosition.collateralLamports > 0n,
    hasBorrow: localPosition.borrowLamports > 0n,
    collateralCiphertext: localPosition.collateralCipher?.ciphertext,
    borrowCiphertext: localPosition.borrowCipher?.ciphertext,
  }), []);

  return {
    loading,
    mpcStatus,
    mpcElapsed,
    lastError,
    depositCollateral,
    queueBorrowValidation,
    finaliseBorrow,
    checkLiquidatable,
    repay,
    getLocalPosition,
    isIdle: mpcStatus === "idle",
    isRunning: ["encrypting", "queued", "computing", "timeout_warning"].includes(mpcStatus),
    isDone: mpcStatus === "done",
    isError: mpcStatus === "error",
  };
}
