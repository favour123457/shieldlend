import { CheckCircleIcon, ClockIcon, WarningIcon, XIcon } from "./Icons";

/**
 * TxStatus — Transaction and MPC computation status tracker.
 * Shows current step in the encrypt → submit → compute → done pipeline.
 */
export default function TxStatus({ mpcStatus, mpcElapsed, error, txHash, onDismiss }) {
  if (mpcStatus === "idle" && !error && !txHash) return null;

  const steps = [
    { key: "encrypting", label: "Encrypt" },
    { key: "queued", label: "Submit" },
    { key: "computing", label: "MPC Compute" },
    { key: "done", label: "Confirmed" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === mpcStatus);
  const isError = mpcStatus === "error" || !!error;
  const isDone = mpcStatus === "done";
  const isRunning = ["encrypting", "queued", "computing", "submitting"].includes(mpcStatus);

  return (
    <div
      className={`border rounded-sm p-4 transition-all duration-300 ${
        isError
          ? "border-[#ff3b3b] bg-[#ff3b3b0a]"
          : isDone
          ? "border-[#00c44f] bg-[#00c44f08] border-flash"
          : "border-[#1a2e1a] bg-[#0d110d]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isError ? (
            <XIcon size={12} color="#ff3b3b" />
          ) : isDone ? (
            <CheckCircleIcon size={12} color="#00c44f" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#00c44f] animate-pulse" />
          )}
          <span className="font-mono text-[10px] tracking-widest uppercase text-[#e8f5e8]">
            {isError ? "Failed" : isDone ? "Complete" : "In Progress"}
          </span>
          {isRunning && mpcElapsed > 0 && (
            <span className="font-mono text-[10px] text-[#00c44f]">
              {mpcElapsed}s
            </span>
          )}
        </div>
        {(isDone || isError) && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[#4a7a4a] hover:text-[#e8f5e8] transition-colors"
          >
            <XIcon size={12} />
          </button>
        )}
      </div>

      {/* Step pipeline */}
      {!isError && (
        <div className="flex items-center gap-0 mb-3">
          {steps.map((step, idx) => {
            const isPast = currentIdx > idx || isDone;
            const isCurrent = currentIdx === idx && !isDone;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isPast || isDone
                        ? "bg-[#00c44f]"
                        : isCurrent
                        ? "bg-[#00c44f] animate-pulse"
                        : "bg-[#1a2e1a]"
                    }`}
                  />
                  <span
                    className={`font-mono text-[8px] tracking-wider mt-1 ${
                      isPast || isDone
                        ? "text-[#00c44f]"
                        : isCurrent
                        ? "text-[#e8f5e8]"
                        : "text-[#4a7a4a]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-1 transition-colors ${
                      isPast || (isDone && idx < steps.length - 1)
                        ? "bg-[#00c44f]"
                        : "bg-[#1a2e1a]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MPC Computing indicator */}
      {mpcStatus === "computing" && (
        <div className="flex items-center gap-2 bg-[#080a08] border border-[#1a2e1a] px-3 py-2 rounded-sm">
          <ClockIcon size={11} color="#00c44f" />
          <span className="font-mono text-[10px] text-[#4a7a4a]">MPC COMPUTING</span>
          <span className="font-mono text-[10px] text-[#00c44f]">{mpcElapsed}s elapsed</span>
          <div className="ml-auto flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-[#00c44f] animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timeout warning */}
      {mpcStatus === "timeout_warning" && (
        <div className="flex items-center gap-2 bg-[#f59e0b0a] border border-[#f59e0b] px-3 py-2 rounded-sm">
          <WarningIcon size={11} />
          <span className="font-mono text-[10px] text-[#f59e0b]">
            Arcium cluster is taking longer than usual ({mpcElapsed}s). This is normal under load.
          </span>
        </div>
      )}

      {/* Error */}
      {isError && error && (
        <div className="bg-[#ff3b3b0a] border border-[#ff3b3b22] px-3 py-2 rounded-sm">
          <p className="font-mono text-[10px] text-[#ff3b3b]">{error}</p>
        </div>
      )}

      {/* Success + tx hash */}
      {isDone && txHash && (
        <a
          href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-mono text-[10px] text-[#4a7a4a] hover:text-[#00c44f] transition-colors"
        >
          <CheckCircleIcon size={10} color="#00c44f" />
          <span className="truncate">{txHash.slice(0, 20)}...</span>
          <span className="text-[#1a2e1a]">→ Explorer</span>
        </a>
      )}
    </div>
  );
}
