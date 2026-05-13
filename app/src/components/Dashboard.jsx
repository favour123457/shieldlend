import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePosition } from "../hooks/usePosition";
import DepositPanel from "./DepositPanel";
import BorrowPanel from "./BorrowPanel";
import RepayPanel from "./RepayPanel";
import LiquidatePanel from "./LiquidatePanel";
import HealthBar from "./HealthBar";
import PrivacyBadge, { CiphertextPreview } from "./PrivacyBadge";
import { ShieldIcon, LockIcon, ZapIcon, CheckCircleIcon } from "./Icons";

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2.5">
      <div className="font-mono text-[9px] text-[#4a7a4a] uppercase tracking-widest mb-1">{label}</div>
      <div className={`font-mono text-lg font-semibold ${accent || "text-[#e8f5e8]"}`}>{value}</div>
      {sub && <div className="font-mono text-[9px] text-[#4a7a4a] mt-0.5">{sub}</div>}
    </div>
  );
}

function PositionField({ label, ciphertext, empty }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1a2e1a] last:border-b-0">
      <span className="font-mono text-[9px] text-[#4a7a4a] uppercase tracking-widest">{label}</span>
      {empty ? (
        <span className="font-mono text-[10px] text-[#1a2e1a]">—</span>
      ) : (
        <CiphertextPreview bytes={ciphertext} />
      )}
    </div>
  );
}

function PrivacyTable() {
  const rows = [
    { field: "Collateral",   bad: "Plaintext u64",       good: "[u8; 32] ciphertext" },
    { field: "Borrow",       bad: "Plaintext u64",       good: "[u8; 32] ciphertext" },
    { field: "Health Factor",bad: "Publicly derivable",  good: "MPC-only computation" },
    { field: "LTV Check",    bad: "Anyone can calculate",good: "Encrypted in cluster"  },
    { field: "Interest",     bad: "Public rate×balance", good: "MPC on encrypted bal." },
  ];
  return (
    <div className="bg-[#0d110d] border border-[#1a2e1a] rounded-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1a2e1a] flex items-center gap-2">
        <ShieldIcon size={12} color="#00c44f" />
        <span className="font-mono text-[9px] text-[#00c44f] tracking-widest uppercase">Privacy Model</span>
      </div>
      <div className="px-3 py-1 grid grid-cols-3 gap-2 border-b border-[#1a2e1a]">
        <span className="font-mono text-[8px] text-[#4a7a4a]">Field</span>
        <span className="font-mono text-[8px] text-[#ff3b3b]">Traditional</span>
        <span className="font-mono text-[8px] text-[#00c44f]">ShieldLend</span>
      </div>
      {rows.map((r) => (
        <div key={r.field} className="grid grid-cols-3 px-3 py-1.5 gap-2 border-b border-[#1a2e1a] last:border-b-0">
          <span className="font-mono text-[8px] text-[#4a7a4a] truncate">{r.field}</span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-[#ff3b3b] flex-shrink-0" />
            <span className="font-mono text-[8px] text-[#4a7a4a] truncate">{r.bad}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-[#00c44f] flex-shrink-0" />
            <span className="font-mono text-[8px] text-[#00c44f] truncate">{r.good}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const ACTION_TABS = [
  { key: "deposit",   label: "Deposit",   sym: "↓" },
  { key: "borrow",    label: "Borrow",    sym: "↗" },
  { key: "repay",     label: "Repay",     sym: "↙" },
  { key: "liquidate", label: "Liquidate", sym: "⚡" },
];

export default function Dashboard({ activeNav }) {
  const { publicKey, connected } = useWallet();
  const { position, protocolState, loading, refresh } = usePosition();
  const [activeTab, setActiveTab] = useState("deposit");
  const [healthResult] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeNav === "lend")      setActiveTab("deposit");
    else if (activeNav === "borrow")    setActiveTab("borrow");
    else if (activeNav === "liquidate") setActiveTab("liquidate");
  }, [activeNav]);

  const handleSuccess = () => setTimeout(refresh, 2000);

  return (
    <div className="flex flex-col gap-6">

      {/* Hero strip */}
      <div className="panel-reveal bg-[#0d110d] border border-[#1a2e1a] rounded-sm px-6 py-4 flex items-center justify-between overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="scan-line absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-[#00c44f04] to-transparent" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 border border-[#1a2e1a] rounded-sm flex items-center justify-center">
            <ShieldIcon size={20} color="#00c44f" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-xl text-[#e8f5e8] tracking-tight">
              Your Position Is <span className="text-[#00c44f]">Private</span>
            </h1>
            <p className="font-mono text-[10px] text-[#4a7a4a] mt-0.5">
              Collateral, borrow, health factor — all encrypted inside Arcium MPC.
              Zero plaintext stored on Solana.
            </p>
          </div>
        </div>
        <div className="hidden md:flex flex-col gap-1.5 items-end relative z-10">
          <PrivacyBadge label="Arcium MPC Active" />
          <span className="font-mono text-[9px] text-[#4a7a4a]">3 circuits · cluster 456</span>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_260px] gap-4 items-start">

        {/* LEFT — Position */}
        <div className="flex flex-col gap-3">

          <div className="card-reveal bg-[#0d110d] border border-[#1a2e1a] rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a2e1a] flex items-center justify-between">
              <span className="font-sans text-xs font-semibold text-[#e8f5e8] tracking-wide">My Position</span>
              {connected && position && <PrivacyBadge />}
            </div>

            {!connected ? (
              <div className="px-4 py-8 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 border border-[#1a2e1a] rounded-full flex items-center justify-center">
                  <LockIcon size={18} color="#1a2e1a" />
                </div>
                <p className="font-mono text-[10px] text-[#4a7a4a]">Connect wallet to view your encrypted position</p>
              </div>
            ) : loading ? (
              <div className="px-4 py-8 flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full border border-[#1a2e1a] border-t-[#00c44f] animate-spin" />
                <span className="font-mono text-[10px] text-[#4a7a4a]">Loading...</span>
              </div>
            ) : !position ? (
              <div className="px-4 py-8 flex flex-col items-center gap-3 text-center">
                <div className="w-8 h-8 border border-[#1a2e1a] rounded-sm flex items-center justify-center">
                  <ZapIcon size={14} color="#4a7a4a" />
                </div>
                <p className="font-mono text-[10px] text-[#4a7a4a]">No position. Deposit collateral to open one.</p>
                <button onClick={() => setActiveTab("deposit")}
                  className="font-mono text-[9px] text-[#00c44f] border border-[#1a2e1a] px-3 py-1 rounded-sm hover:border-[#00c44f] transition-colors tracking-widest uppercase">
                  Open Position →
                </button>
              </div>
            ) : (
              <div className="px-4 py-2">
                <div className="flex items-center justify-between py-2 border-b border-[#1a2e1a]">
                  <span className="font-mono text-[9px] text-[#4a7a4a] uppercase tracking-widest">Owner</span>
                  <span className="font-mono text-[10px] text-[#e8f5e8]">{publicKey?.toBase58().slice(0, 8)}...</span>
                </div>
                <PositionField label="Collateral" ciphertext={position.collateralCiphertext} empty={!position.hasCollateral} />
                <PositionField label="Borrow"     ciphertext={position.borrowCiphertext}    empty={!position.hasBorrow}     />
                <div className="flex items-center justify-between py-2 border-b border-[#1a2e1a]">
                  <span className="font-mono text-[9px] text-[#4a7a4a] uppercase tracking-widest">Last Slot</span>
                  <span className="font-mono text-[10px] text-[#4a7a4a]">{position.lastUpdateSlot?.toString()}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-mono text-[9px] text-[#4a7a4a] uppercase tracking-widest">Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00c44f]" />
                    <span className="font-mono text-[10px] text-[#00c44f]">Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card-reveal" style={{ animationDelay: "0.15s" }}>
            <HealthBar lastCheckResult={healthResult} />
          </div>
        </div>

        {/* CENTRE — Action panels */}
        <div className="card-reveal" style={{ animationDelay: "0.1s" }}>
          <div className="bg-[#0d110d] border border-[#1a2e1a] rounded-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-[#1a2e1a]">
              {ACTION_TABS.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 font-sans text-xs transition-colors border-r border-[#1a2e1a] last:border-r-0 relative ${
                    activeTab === tab.key
                      ? "text-[#e8f5e8] bg-[#00c44f08]"
                      : "text-[#4a7a4a] hover:text-[#e8f5e8] hover:bg-[#ffffff03]"
                  }`}>
                  <span className="font-mono text-[10px]">{tab.sym}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-[#00c44f]" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === "deposit"   && <DepositPanel   position={position} onSuccess={handleSuccess} />}
              {activeTab === "borrow"    && <BorrowPanel    position={position} onSuccess={handleSuccess} />}
              {activeTab === "repay"     && <RepayPanel     position={position} onSuccess={handleSuccess} />}
              {activeTab === "liquidate" && <LiquidatePanel onSuccess={handleSuccess} />}
            </div>
          </div>
        </div>

        {/* RIGHT — Stats + info */}
        <div className="flex flex-col gap-3 card-reveal" style={{ animationDelay: "0.2s" }}>

          <div className="bg-[#0d110d] border border-[#1a2e1a] rounded-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-[#1a2e1a]">
              <span className="font-sans text-xs font-semibold text-[#e8f5e8] tracking-wide">Protocol</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <StatCard label="Total Deposits"
                value={protocolState ? `${protocolState.totalDepositsSOL.toFixed(2)} SOL` : "—"}
                sub="Vault SOL (positions encrypted)" accent="text-[#00c44f]" />
              <StatCard label="Total Borrows"
                value={protocolState ? `${protocolState.totalBorrowsSOL.toFixed(2)} SOL` : "—"}
                sub="Outstanding loans" />
              <StatCard label="Borrow APR" value="5.00%" sub="Fixed · MPC interest calc." />
              <StatCard label="Max LTV"    value="75%"   sub="Liq. threshold: 80%" />
            </div>
          </div>

          <div className="bg-[#0d110d] border border-[#1a2e1a] rounded-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-[#1a2e1a] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00c44f] animate-pulse" />
              <span className="font-mono text-[9px] text-[#00c44f] tracking-widest uppercase">MPC Circuits</span>
            </div>
            <div className="p-3 flex flex-col gap-0">
              {[
                { name: "check_liquidatable", desc: "LTV health check" },
                { name: "validate_borrow",    desc: "Borrow LTV guard" },
                { name: "apply_interest",     desc: "Interest accrual" },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-2 py-1.5 border-b border-[#1a2e1a] last:border-b-0">
                  <CheckCircleIcon size={10} color="#00c44f" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[9px] text-[#e8f5e8] truncate">{c.name}</div>
                    <div className="font-mono text-[8px] text-[#4a7a4a]">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PrivacyTable />

          <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2">
            <p className="font-mono text-[9px] text-[#4a7a4a] mb-1.5 uppercase tracking-widest">Resources</p>
            <div className="flex flex-col gap-1">
              {[
                { label: "Arcium Docs",            href: "https://docs.arcium.com" },
                { label: "Solana Devnet Explorer", href: "https://explorer.solana.com/?cluster=devnet" },
                { label: "RTG Grant Programme",    href: "https://arcium.com/rtg" },
              ].map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-[9px] text-[#4a7a4a] hover:text-[#00c44f] transition-colors">
                  → {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
