import idl from "../idl/shieldlend.json";

// Program ID is sourced from the generated IDL so the frontend cannot drift.
export const PROGRAM_ID = idl.address;

// Arcium devnet cluster offset
export const CLUSTER_OFFSET = 456;

// Protocol parameters (must match lib.rs)
export const MAX_LTV_BPS = 7500n;        // 75% maximum LTV for borrowing
export const LIQ_THRESHOLD_BPS = 8000n;  // 80% LTV triggers liquidation
export const INTEREST_RATE_BPS = 500n;   // 5% annual APR
export const RESERVE_FEE_BPS = 1000n;    // 10% of accrued interest goes to reserve accounting

// Solana
export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const NETWORK = "devnet";

// Replace with your Helius, Alchemy, or QuickNode devnet URL for better reliability.
export const RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  "https://devnet.helius-rpc.com/?api-key=92aad4bf-71ef-41b1-ae22-0ee0067029a3";

// Arcium program ID (devnet)
export const ARCIUM_PROGRAM_ID = "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ";

// MPC computation timeout warning threshold (ms)
export const MPC_TIMEOUT_WARN_MS = 60_000;
