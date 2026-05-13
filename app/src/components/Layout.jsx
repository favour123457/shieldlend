import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ShieldIcon } from "./Icons";
import { MpcSecuredTag } from "./PrivacyBadge";

export default function Layout({ children, activeTab, onTabChange }) {
  const NAV_TABS = ["Lend", "Borrow", "Liquidate"];

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">

      {/* Top Banner */}
      <div className="border-b border-green-border bg-[#080a08]">
        <div className="max-w-[1200px] mx-auto px-6 py-1.5 flex items-center justify-center gap-2">
          <div className="w-1 h-1 rounded-full bg-[#00c44f] animate-pulse" />
          <span className="font-mono text-[9px] text-[#4a7a4a] tracking-[0.25em] uppercase">
            Running on Arcium MPC Devnet — Cluster Offset 456 — All computations encrypted
          </span>
          <div className="w-1 h-1 rounded-full bg-[#00c44f] animate-pulse" />
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-green-border sticky top-0 z-50 bg-bg-base">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldIcon size={18} color="#00c44f" />
            <span className="font-sans font-bold text-base tracking-tight text-text-primary">
              Shield<span className="text-green-primary">Lend</span>
            </span>
            <span className="font-mono text-[9px] text-green-muted border border-green-border px-1.5 py-0.5 tracking-widest uppercase rounded-sm">
              Devnet
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-0 border border-green-border rounded-sm overflow-hidden">
            {NAV_TABS.map((item) => (
              <button
                key={item}
                onClick={() => onTabChange && onTabChange(item.toLowerCase())}
                className={`font-sans text-xs px-4 py-2 transition-colors border-r border-green-border last:border-r-0 ${
                  activeTab === item.toLowerCase()
                    ? "bg-[#00c44f08] text-green-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-[#ffffff04]"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <MpcSecuredTag />
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1200px] mx-auto px-6 py-8 w-full flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-green-border mt-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-text-secondary">
              Powered by{" "}
              <a href="https://arcium.com" target="_blank" rel="noopener noreferrer"
                className="text-green-primary hover:text-green-hover transition-colors">
                Arcium MPC Network
              </a>
            </span>
            <span className="font-mono text-[10px] text-[#1a2e1a]">·</span>
            <span className="font-mono text-[10px] text-text-secondary">
              Cluster Offset: <span className="text-green-muted">456</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-text-secondary">
              Recovery Set: 4 nodes
            </span>
            <span className="font-mono text-[10px] text-[#1a2e1a]">·</span>
            <a href="https://github.com/your-org/shieldlend" target="_blank" rel="noopener noreferrer"
              className="font-mono text-[10px] text-text-secondary hover:text-green-primary transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
