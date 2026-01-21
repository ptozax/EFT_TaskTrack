// --- Styles Configuration (Tarkov Theme) ---
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

export const styles = {
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
    Rotate: (p) => <Icon {...p}><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></Icon>
};