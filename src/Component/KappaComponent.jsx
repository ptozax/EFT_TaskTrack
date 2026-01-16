// --- Styles ---
// Helper to manage colors and common styles
export const COLORS = {
    bgDark: '#0f172a',    // slate-950
    bgCard: '#1f2937',    // gray-800
    bgHeader: '#111827',  // gray-900
    textPrimary: '#f3f4f6', // gray-100
    textSecondary: '#9ca3af', // gray-400
    border: '#374151',    // gray-700
    accent: '#eab308',    // yellow-500
    success: '#16a34a',   // green-600
    danger: '#ff0000',    // red
    blue: '#3b82f6',      // blue-500
    hoverBg: '#374151',   // lighter gray for hover
};

export const styles = {
    containerStyle: {
        width: '100%',
        height: '0.75rem', // h-3
        backgroundColor: '#374151', // bg-gray-700
        borderRadius: '9999px',
        overflow: 'hidden',
    },
    fillStyle: {
        height: '100%',
        transition: 'width 0.5s ease-out',
    },
    cardStyle: {
        marginBottom: '2rem',
        backgroundColor: COLORS.bgCard,
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },

    headerStyle: {
        backgroundColor: COLORS.bgHeader,
        padding: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'background-color 0.2s'
    },
    avatarStyle: {
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '1.125rem',
    },
    rowStyle: {
        padding: '1rem',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
    },
    checkboxStyle: {
        marginTop: '0.25rem',
        flexShrink: 0,
        width: '1.5rem',
        height: '1.5rem',
        borderRadius: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    badgeStyle: {
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        backgroundColor: '#374151',
        fontSize: '0.75rem',
        border: '1px solid #4b5563',
    },
    // --- App Styles ---
    appContainerStyle: {
        minHeight: '100vh',
        backgroundColor: COLORS.bgDark,
        color: COLORS.textPrimary,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        paddingBottom: '2rem'
    },
    stickyHeaderStyle: {
        backgroundColor: COLORS.bgHeader,
        borderBottom: `1px solid ${COLORS.bgCard}`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    contentWrapperStyle: {
        maxWidth: '1024px',
        margin: '0 auto',
        padding: '1rem',
    },
    controlBarStyle: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
    },
    inputStyle: {
        width: '100%',
        backgroundColor: COLORS.bgHeader,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '0.5rem',
        padding: '0.5rem 1rem 0.5rem 2.5rem',
        color: COLORS.textPrimary,
        fontSize: '1rem',
    },
    buttonStyle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textPrimary,
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    resetButtonStyle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        backgroundColor: 'transparent',
        color: '#f87171', // red-400
        cursor: 'pointer',
        marginLeft: 'auto',
    },
    // Modal Styles
    modalOverlayStyle: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backdropFilter: 'blur(4px)',
        padding: '1rem'
    },
    modalContentStyle: {
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center'
    },
    modalButtonsContainerStyle: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        marginTop: '1.5rem'
    },
    modalConfirmButtonStyle: {
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        fontWeight: '600',
        cursor: 'pointer'
    },
    modalCancelButtonStyle: {
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        backgroundColor: 'transparent',
        color: COLORS.textPrimary,
        border: `1px solid ${COLORS.border}`,
        cursor: 'pointer'
    }
}

// --- Icons (Inline SVGs) ---
export const CheckIcon = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="20 6 9 17 5 12"></polyline>
    </svg>
);

export const CrossIcon = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M18 6L6 18M6 6L18 18" />
    </svg>
);

export const ExternalLinkIcon = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
);

export const FilterIcon = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

export const SearchIcon = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

export const TrophyIcon = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M8 21h8"></path>
        <path d="M12 17v4"></path>
        <path d="M7 4h10"></path>
        <path d="M17 4v8a5 5 0 0 1-10 0V4"></path>
        <path d="M7 4H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"></path>
        <path d="M17 4h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"></path>
    </svg>
);

export const RotateCcwIcon = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="1 4 1 10 7 10"></polyline>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
);

export const ChevronUpIcon = ({ size = 24, style = {} }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
);

export const ChevronDownIcon = ({ size = 24, style = {} }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);