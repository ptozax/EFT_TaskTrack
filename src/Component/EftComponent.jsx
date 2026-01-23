// --- Hideout Theme ---
export const theme = {
    colors: {
        bgMain: '#0f172a',    // Slate 900
        bgCard: '#1e293b',    // Slate 800
        bgHeader: '#020617',  // Slate 950
        textMain: '#e2e8f0',  // Slate 200
        textMuted: '#64748b', // Slate 500
        accent: '#f97316',    // Orange 500
        accentHover: '#ea580c', // Orange 600
        border: '#334155',    // Slate 700
        success: '#22c55e',   // Green 500
        successBg: 'rgba(34, 197, 94, 0.1)',
        danger: '#ef4444',
        fir: '#38bdf8',       // Sky 400 (Found In Raid)
        firBg: 'rgba(56, 189, 248, 0.15)',
        firBorder: 'rgba(56, 189, 248, 0.3)',
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
    },
    rounded: '8px',
};

export const hideoutStyles = {
    container: {
        minHeight: '100vh',
        backgroundColor: theme.colors.bgMain,
        color: theme.colors.textMain,
        fontFamily: 'sans-serif',
        display: 'flex',
    },
    mainContent: {
        flex: 1,
        padding: theme.spacing.lg,
        transition: 'all 0.3s',
    },
    header: {
        borderBottom: `1px solid ${theme.colors.border}`,
        paddingBottom: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    headerTop: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        flexWrap: 'wrap',
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: theme.colors.accent,
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        margin: 0,
    },
    subtitle: {
        color: theme.colors.textMuted,
        fontSize: '14px',
        fontFamily: 'monospace',
        marginTop: theme.spacing.xs,
    },
    navGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    navButton: (active, isMax) => ({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: theme.spacing.sm,
        borderRadius: theme.rounded,
        border: `1px solid ${active ? theme.colors.border : 'transparent'}`,
        backgroundColor: active ? theme.colors.bgCard : 'rgba(15, 23, 42, 0.5)',
        color: active ? theme.colors.textMain : theme.colors.textMuted,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
    }),
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: theme.spacing.xl,
        Width: '1800px',
        margin: '0 auto',
    },
    card: {
        backgroundColor: theme.colors.bgCard,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.rounded,
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        scrollMarginTop: '20px',
    },
    cardHeader: {
        backgroundColor: theme.colors.bgHeader,
        padding: theme.spacing.md,
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: theme.colors.accent,
        color: '#fff',
    },
    maxBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
        color: theme.colors.success,
        backgroundColor: theme.colors.successBg,
        border: `1px solid ${theme.colors.success}`,
        padding: '4px 8px',
        borderRadius: theme.rounded,
        fontSize: '12px',
        fontWeight: 'bold',
    },
    firBadge: {
        position: 'absolute',
        padding: '5px',
        borderRadius: '50px',
        color: '#ffc400',
        border: `1px solid #ffc400`,
        marginTop: '2.5px',
        display: 'inline-block',
        verticalAlign: 'middle',
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: theme.colors.textMuted,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    reqItem: (checked) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.sm,
        borderRadius: theme.rounded,
        border: '1px solid',
        borderColor: checked ? 'transparent' : theme.colors.border,
        backgroundColor: checked ? 'rgba(15, 23, 42, 0.8)' : theme.colors.bgCard,
        opacity: checked ? 0.6 : 1,
        cursor: 'pointer',
        marginBottom: theme.spacing.xs,
    }),
    btnPrimary: (disabled) => ({
        backgroundColor: disabled ? theme.colors.border : theme.colors.accentHover,
        color: disabled ? theme.colors.textMuted : '#fff',
        padding: '12px 24px',
        borderRadius: theme.rounded,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 6px -1px rgba(249, 115, 22, 0.3)',
    }),
    sidebar: (isOpen) => ({
        position: 'fixed',
        right: 0,
        top: 60,
        height: '93%',
        width: '100%',
        backgroundColor: theme.colors.bgHeader,
        borderLeft: `1px solid ${theme.colors.border}`,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        zIndex: 50,
        overflowY: 'auto',
    }),
    sidebarHeader: {
        padding: theme.spacing.lg,
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.95)',
        zIndex: 10,
        flexDirection: 'column',
    },
    checkboxWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        color: theme.colors.textMuted,
        fontSize: '14px',
        fontWeight: '500',
        padding: '4px 8px',
        borderRadius: '4px',
        border: `1px solid ${theme.colors.border}`,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    checkbox: {
        accentColor: theme.colors.accent,
        width: '16px',
        height: '16px',
        cursor: 'pointer',
    }
};

// --- Kappa Theme ---
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

export const kappaStyles = {
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
};

// --- Map Theme ---
export const mapStyles = {
    container: {
        display: 'flex',
        height: '93vh',
        // width: '100vw',
        backgroundColor: '#020617',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
    },
    sidebar: {
        width: '25%',
        height: '100%',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto',
        zIndex: 20,
        transition: 'all 0.3s ease-in-out',
    },
    main: {
        width: '75%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        overflow: 'hidden',
        transition: 'width 0.3s ease-in-out',
    },
    toggleButton: {
        position: 'absolute',
        top: '75px',
        left: '24px',
        zIndex: 60,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #334155',
        color: '#f8fafc',
        borderRadius: '8px',
        padding: '8px',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: '10px',
        fontWeight: '800',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom: '8px',
        display: 'block',
    },
    select: {
        width: '100%',
        padding: '12px',
        borderRadius: '10px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        color: '#f8fafc',
        outline: 'none',
        fontSize: '14px',
    },
    questCard: {
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        marginBottom: '8px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.2s ease',
    },
    marker: {
        position: 'absolute',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '1px solid white',
        boxShadow: '0 0 8px rgba(0,0,0,0.8)',
        zIndex: 30,
        cursor: 'default'
    },
    descriptionMarker: {
        position: 'absolute',
        borderRadius: '5px',
        border: '1px solid white',
        boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
        width: "300px",
        padding: "2px",
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'black',
        fontSize: '15px',
        fontWeight: 'bold',
        color: 'white',
        cursor: 'pointer'
    },
    extractMarker: {
        position: 'absolute',
        width: '20px',
        height: '20px',
        boxShadow: '0 0 8px rgba(0,0,0,0.8)',
        zIndex: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        color: 'black',
        cursor: 'help'
    },
    keysMarker: {
        position: 'absolute',
        width: '7%',
        height: '7%',
        boxShadow: '0 0 8px rgba(0,0,0,0.8)',
        borderRadius: '20%',
        zIndex: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        color: 'black',
        cursor: 'help'
    },
    origin: {
        position: 'absolute',
        width: '20px',
        height: '20px',
        border: '1px solid #ef4444',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 25,
    },
    originLine: {
        position: 'absolute',
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        pointerEvents: 'none',
        zIndex: 24,
    },
    zoomControls: {
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 50,
    },
    zoomBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #334155',
        color: '#f8fafc',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
    },
    calibrationBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        border: '1px solid #334155',
        color: '#f8fafc',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
    },
    coordBox: {
        position: 'absolute',
        top: '24px',
        right: '24px',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: '10px 16px',
        borderRadius: '10px',
        border: '1px solid #334155',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
    },
    calibrationPanel: {
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #334155',
        zIndex: 50,
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backdropFilter: 'blur(10px)',
    },
    checkboxRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        color: '#cbd5e1',
        cursor: 'pointer',
    },
    controlRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    inputNumber: {
        width: '80px',
        backgroundColor: '#020617',
        border: '1px solid #334155',
        borderRadius: '4px',
        color: '#60a5fa',
        fontSize: '11px',
        padding: '2px 4px',
        outline: 'none',
    },
    btnSmall: {
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '4px'
    },
};

// --- Ammo Theme ---
export const AmmoStyles = {
    container: {
        minHeight: '93vh',
        backgroundColor: '#09090b', // zinc-950
        color: '#f4f4f5', // zinc-100
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    header: {
        backgroundColor: '#18181b', // zinc-900
        borderBottom: '1px solid #27272a', // zinc-800
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    headerInner: {
        maxWidth: '80rem', // max-w-7xl
        margin: '0 auto',
        padding: '1rem',
    },
    headerFlex: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    logoSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    logoIcon: {
        width: '2.5rem',
        height: '2.5rem',
        backgroundColor: '#2563eb', // blue-600
        borderRadius: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)',
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: '700',
        letterSpacing: '-0.025em',
        color: '#ffffff',
        lineHeight: 1,
        margin: 0,
    },
    subtitle: {
        fontSize: '0.75rem',
        color: '#71717a', // zinc-500
        marginTop: '0.25rem',
        margin: 0,
    },
    controlsSection: {
        display: 'flex',
        flexDirection: 'row',
        gap: '0.75rem',
        width: 'auto',
        flexWrap: 'wrap',
    },
    searchContainer: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '0.75rem',
        color: '#71717a', // zinc-500
    },
    searchInput: {
        width: '16rem',
        backgroundColor: '#09090b', // zinc-950
        border: '1px solid #3f3f46', // zinc-700
        fontSize: '0.875rem',
        borderRadius: '0.375rem',
        padding: '0.5rem 1rem 0.5rem 2.5rem',
        outline: 'none',
        color: '#ffffff',
        transition: 'all 0.15s ease-in-out',
    },
    caliberSelect: {
        backgroundColor: '#09090b', // zinc-950
        border: '1px solid #3f3f46', // zinc-700
        fontSize: '0.875rem',
        borderRadius: '0.375rem',
        padding: '0.5rem 0.75rem',
        outline: 'none',
        color: '#d4d4d8', // zinc-300
        cursor: 'pointer',
    },
    main: {
        maxWidth: '80rem', // max-w-7xl
        margin: '0 auto',
        padding: '1.5rem 1rem',
    },
    legendToggle: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '0.5rem',
    },
    legendButton: {
        fontSize: '0.75rem',
        color: '#60a5fa', // blue-400
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
    },
    legendContainer: {
        backgroundColor: '#18181b', // zinc-900
        border: '1px solid #27272a', // zinc-800
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem',
    },
    legendTitle: {
        fontSize: '0.875rem',
        fontWeight: '700',
        color: '#d4d4d8', // zinc-300
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: 0,
    },
    legendGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.5rem',
        fontSize: '0.75rem',
        textAlign: 'center',
    },
    tableContainer: {
        backgroundColor: '#18181b', // zinc-900
        border: '1px solid #27272a', // zinc-800
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        textAlign: 'left',
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
        borderCollapse: 'collapse',
    },
    th: {
        padding: '0.75rem 1rem',
        fontWeight: '500',
        borderBottom: '1px solid #27272a', // zinc-800
        color: '#a1a1aa', // zinc-400
        backgroundColor: 'rgba(9, 9, 11, 0.5)', // zinc-950/50
        cursor: 'pointer',
    },
    td: {
        padding: '0.5rem 1rem',
        borderBottom: '1px solid #27272a', // zinc-800
        color: '#e4e4e7', // zinc-200
    },
    row: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
    },
    iconCell: {
        width: '2.25rem',
        height: '2.25rem',
        backgroundColor: '#09090b', // zinc-950
        borderRadius: '0.25rem',
        border: '1px solid #27272a', // zinc-800
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        margin: '0 auto',
    },
    armorHeader: {
        padding: '0.75rem 0.5rem',
        fontWeight: '700',
        textAlign: 'center',
        width: '2.5rem',
        color: '#d4d4d8', // zinc-300
        backgroundColor: 'rgba(39, 39, 42, 0.3)', // zinc-800/30
        borderBottom: '1px solid #27272a',
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
    },
    modalContent: {
        backgroundColor: '#18181b', // zinc-900
        border: '1px solid #3f3f46', // zinc-700
        borderRadius: '0.5rem',
        maxWidth: '42rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        color: '#a1a1aa', // zinc-400
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    modalBody: {
        padding: '1.5rem',
    },
    modalHeader: {
        display: 'flex',
        gap: '1.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
    },
    modalImageContainer: {
        flexShrink: 0,
        backgroundColor: '#09090b', // zinc-950
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #27272a', // zinc-800
    },
    pill: {
        padding: '0.25rem 0.75rem',
        backgroundColor: '#27272a', // zinc-800
        color: '#d4d4d8', // zinc-300
        borderRadius: '9999px',
        fontSize: '0.875rem',
        border: '1px solid #3f3f46', // zinc-700
        fontWeight: '500',
    },
    tracerPill: {
        padding: '0.25rem 0.75rem',
        backgroundColor: 'rgba(69, 10, 10, 0.5)', // red-950/50
        color: '#f87171', // red-400
        borderRadius: '9999px',
        fontSize: '0.875rem',
        border: '1px solid rgba(127, 29, 29, 0.5)', // red-900/50
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
    },
    sectionTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
        color: '#d4d4d8', // zinc-300
        borderBottom: '1px solid #3f3f46', // zinc-700
        paddingBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
    },
    statBox: {
        backgroundColor: 'rgba(39, 39, 42, 0.4)', // zinc-800/40
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid rgba(63, 63, 70, 0.5)', // zinc-700/50
    },
    statLabel: {
        color: '#71717a', // zinc-500
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.25rem',
        fontWeight: '600',
    },
    statRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.25rem 0',
        borderBottom: '1px solid #27272a', // zinc-800
    },
};

// --- Helper Components ---
const Icon = ({ children, size = 20, color = "currentColor", style = {} }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', ...style }}
    >
        {children}
    </svg>
);

export const Icons = {
    Hammer: (p) => <Icon {...p}><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V7.86c0-.55-.45-1-1-1H16.4c-.84 0-1.65-.33-2.25-.93L12.9 4.68" /><path d="M16.82 7.78 19.5 5.1a2.12 2.12 0 1 1 3 3l-2.68 2.68" /></Icon>,
    Check: (p) => <Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>,
    Lock: (p) => <Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>,
    ArrowUp: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="m16 12-4-4-4 4" /><path d="M12 16V8" /></Icon>,
    Component: (p) => <Icon {...p}><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z" /><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z" /><path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z" /><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z" /></Icon>,
    Package: (p) => <Icon {...p}><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22v-9" /></Icon>,
    Clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>,
    Book: (p) => <Icon {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Icon>,
    Cart: (p) => <Icon {...p}><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></Icon>,
    Close: (p) => <Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>,
    Crown: (p) => <Icon {...p}><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></Icon>,
    Filter: (p) => <Icon {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Icon>,
    Rotate: (p) => <Icon {...p}><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></Icon>,
    Cross: (p) => <Icon {...p}><path d="M18 6L6 18M6 6L18 18" /></Icon>,
    ExternalLink: (p) => <Icon {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line></Icon>,
    Search: (p) => <Icon {...p}><path d="M8 21h8"></path>
        <path d="M12 17v4"></path>
        <path d="M7 4h10"></path>
        <path d="M17 4v8a5 5 0 0 1-10 0V4"></path>
        <path d="M7 4H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"></path>
        <path d="M17 4h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"></path></Icon>,
    ChevronUp: (p) => <Icon {...p}><polyline points="18 15 12 9 6 15"></polyline></Icon>,
    ChevronDown: (p) => <Icon {...p}><polyline points="6 9 12 15 18 9"></polyline></Icon>,
    Crosshair: (p) => <Icon {...p}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <circle cx="12" cy="12" r="1" /></Icon>,
    ShieldAlert: (p) => <Icon {...p}><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
        <path d="M12 12v-2" />
        <path d="M12 16h.01" /></Icon>,
    Zap: (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>,
    HelpCircle: (p) => <Icon {...p}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" /></Icon>,
    Info: (p) => <Icon {...p}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></Icon>,
    RotateCcw: (p) => <Icon {...p}><polyline points="1 4 1 10 7 10"></polyline>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></Icon>,
    Trophy: (p) => <Icon {...p}><path d="M8 21h8"></path>
        <path d="M12 17v4"></path>
        <path d="M7 4h10"></path>
        <path d="M17 4v8a5 5 0 0 1-10 0V4"></path>
        <path d="M7 4H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"></path>
        <path d="M17 4h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"></path></Icon>,

};

export const TRADER_THEMES = {
    "Prapor": { bg: "#7b1fa2", border: "#e1bee7", text: "#ffffff" }, // ม่วงสด
    "Therapist": { bg: "#0288d1", border: "#81d4fa", text: "#ffffff" }, // ฟ้าสด
    "Skier": { bg: "#f57c00", border: "#ffe0b2", text: "#ffffff" }, // ส้มสด
    "Peacekeeper": { bg: "#2e7d32", border: "#a5d6a7", text: "#ffffff" }, // เขียวเข้มทหาร
    "Mechanic": { bg: "#D34E4E", border: "#ffcdd2", text: "#ffffff" }, // แดงชมพู (ตามที่คุณชอบแต่สดขึ้น)
    "Ragman": { bg: "#c2185b", border: "#f8bbd0", text: "#ffffff" }, // ชมพูบานเย็น
    "Jaeger": { bg: "#689f38", border: "#dcedc8", text: "#ffffff" }, // เขียวสว่าง
    "Fence": { bg: "#5d4037", border: "#d7ccc8", text: "#ffffff" }, // น้ำตาลเข้ม
    "Lightkeeper": { bg: "#ffea00ff", border: "#f57f17", text: "#000000" }, // เหลืองทองสว่าง (Text ดำ)
    "BTR Driver": { bg: "#ffeb3b", border: "#212121", text: "#000000" }, // เหลือง Taxi/Hazard (เด่นที่สุด)
    "Ref": { bg: "#d32f2f", border: "#ffcdd2", text: "#ffffff" }, // แดงสด Arena
};