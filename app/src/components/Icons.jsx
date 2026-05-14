export const ShieldLendMark = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path
      d="M24 4.5 39 10v11.7c0 10.4-6.4 17.8-15 21.8C15.4 39.5 9 32.1 9 21.7V10l15-5.5Z"
      fill="rgba(0,196,79,0.10)"
      stroke="#00c44f"
      strokeWidth="2"
    />
    <path
      d="M13.8 28.3h8.9c2.7 0 5.3-.7 7.6-2l5.1-3c1.2-.7 2.5.7 1.7 1.8-2.1 3.1-5.4 5.4-9.1 6.3l-5.1 1.3c-1.5.4-3.1.2-4.5-.5l-4.6-2.3v-1.6Z"
      fill="#a7f3b9"
    />
    <path
      d="M14.2 24.2h9.4c1.4 0 2.5 1.1 2.5 2.5 0 1.3-1.1 2.4-2.5 2.4h-5.8"
      stroke="#052210"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path d="M20 32.8c1.2.5 2.4.5 3.8.1l4.4-1.2" stroke="#052210" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    <circle cx="29.5" cy="18.5" r="5.2" fill="#00c44f" stroke="#052210" strokeWidth="1.5" />
    <path d="M29.5 15.8v5.4M27.4 17.1h3.1a1.4 1.4 0 0 1 0 2.8h-2.7" stroke="#052210" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M12.8 22.8h4v11h-4a2.2 2.2 0 0 1-2.2-2.2V25a2.2 2.2 0 0 1 2.2-2.2Z" fill="#00c44f" stroke="#052210" strokeWidth="1" />
  </svg>
);

export const Lock = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const Eye = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const Zap = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const Check = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const WalletIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M4 7.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    <path d="M16.5 12.2h4v3.1h-4a1.55 1.55 0 0 1 0-3.1Z" />
    <path d="M5 7.5 15.3 4.8a2 2 0 0 1 2.5 1.9v.8" />
  </svg>
);
