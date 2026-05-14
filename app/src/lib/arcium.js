/**
 * arcium.js — Fixed client-side Arcium MPC utilities for ShieldLend.
 * Fixes: getMXEPublicKeyWithRetry → getMXEPublicKey
 *        randomBytes from @noble/hashes/utils → native crypto
 */

import {
  RescueCipher,
  getMXEPublicKey,
  awaitComputationFinalization,
} from "@arcium-hq/client";
import { x25519 } from "@noble/curves/ed25519";
import { MPC_TIMEOUT_WARN_MS } from "./constants";

// Use native browser crypto instead of @noble/hashes/utils (Vite compat)
const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

// ── Encryption ────────────────────────────────────────────────

export async function encryptAmount(amountLamports, mxePublicKey) {
  const encrypted = await encryptValues([amountLamports], mxePublicKey);
  return {
    ciphertext: encrypted.ciphertexts[0],
    nonce: encrypted.nonce,
    nonceBytes: encrypted.nonceBytes,
    privateKey: encrypted.privateKey,
    publicKey: encrypted.publicKey,
    sharedSecret: encrypted.sharedSecret,
    cipher: encrypted.cipher,
  };
}

export async function encryptValues(values, mxePublicKey) {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  const nonceBytes = randomBytes(16);
  const ciphertexts = cipher.encrypt(values.map((value) => BigInt(value)), nonceBytes);

  // 16-byte LE nonce → u128 bigint
  let nonceBigInt = 0n;
  for (let i = 15; i >= 0; i--) {
    nonceBigInt = (nonceBigInt << 8n) | BigInt(nonceBytes[i]);
  }

  return {
    ciphertexts,
    nonce: nonceBigInt,
    nonceBytes,
    privateKey,
    publicKey,
    sharedSecret,
    cipher,
  };
}

export function generateSessionKey(mxePublicKey) {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  return { privateKey, publicKey, sharedSecret };
}

// ── Decryption ────────────────────────────────────────────────

export function decryptResult(ciphertextBytes, nonceBytes, sharedSecret) {
  const cipher = new RescueCipher(sharedSecret);
  const decrypted = cipher.decrypt(
    [new Uint8Array(ciphertextBytes)],
    new Uint8Array(nonceBytes)
  );
  return decrypted[0]; // bigint
}

// ── MXE Key ───────────────────────────────────────────────────

export async function getMXEPubkey(provider, programId) {
  return getMXEPublicKey(provider, programId);
}

// ── Computation Lifecycle ─────────────────────────────────────

export async function waitForComputation(provider, computationOffset, programId, onTimeout) {
  const warnTimer = setTimeout(() => {
    if (onTimeout) onTimeout();
  }, MPC_TIMEOUT_WARN_MS);

  try {
    await awaitComputationFinalization(provider, computationOffset, programId, "confirmed");
  } finally {
    clearTimeout(warnTimer);
  }
}

// ── Utilities ─────────────────────────────────────────────────

export function formatCiphertext(bytes) {
  if (!bytes) return "—";
  const arr = Array.from(bytes);
  if (arr.every(b => b === 0)) return "—";
  return "0x" + arr.slice(0, 4).map(b => b.toString(16).padStart(2, "0")).join("") + "...";
}

export function solToLamports(sol) {
  return BigInt(Math.floor(Number(sol) * 1e9));
}

export function formatSOL(lamports) {
  if (lamports === null || lamports === undefined) return "—";
  const value = typeof lamports?.toString === "function" ? lamports.toString() : lamports;
  return `${(Number(value) / 1e9).toFixed(4)} SOL`;
}

export function randomComputationOffset() {
  const bytes = randomBytes(8);
  let result = 0n;
  for (let i = 7; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result & 0x7fffffffffffffffn;
}
