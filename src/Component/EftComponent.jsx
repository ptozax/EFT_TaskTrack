// --- Hideout Theme ---
export const theme = {
    colors: {
        bgMain: '#0f172a',    // Slate 900
        bgCard: '#1e293b',    // Slate 800
        bgHeader: '#0b1120',  // Slate 950
        textMain: '#e2e8f0',  // Slate 200
        textMuted: '#94a3b8', // Slate 400
        accent: '#eab308',    // Gold 500 (unified accent)
        accentHover: '#ca9a04', // Gold 600
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
        fontSize: '16.5px',
        fontFamily: 'monospace',
        marginTop: theme.spacing.xs,
    },
    navGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    navButton: (active) => ({
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
        fontSize: '14px',
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
        fontSize: '14px',
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
        fontSize: '14px',
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
        boxShadow: disabled ? 'none' : '0 4px 6px -1px rgba(234, 179, 8, 0.3)',
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
        fontSize: '16.5px',
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
    bgDark: '#0f172a',    // slate-900
    bgCard: '#1e293b',    // slate-800
    bgHeader: '#0b1120',  // slate deep
    textPrimary: '#e2e8f0', // slate-200
    textSecondary: '#94a3b8', // slate-400
    border: '#334155',    // slate-700
    accent: '#eab308',    // gold-500 (unified accent)
    success: '#22c55e',   // green-500
    danger: '#ef4444',    // red-500
    blue: '#3b82f6',      // blue-500
    hoverBg: '#334155',   // lighter gray for hover
};

export const kappaStyles = {
    containerStyle: {
        width: '100%',
        height: '0.75rem', // h-3
        backgroundColor: '#334155', // bg-gray-700
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
        backgroundColor: '#334155',
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
        backgroundColor: '#0b1120',
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
        background: '#0b1120',
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
        fontSize: '12px',
        fontWeight: '800',
        color: '#8b99ad',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom: '8px',
        display: 'block',
    },
    /* ช่องเลือกแมพ — ลูกศรของเบราว์เซอร์เป็นสีระบบ ดูหลุดจากแผงที่เหลือ
       เลยปิด appearance แล้ววาดลูกศรเองด้วย background-image แทน
       (เว้น paddingRight ไว้ให้ลูกศรไม่ทับตัวหนังสือชื่อแมพยาว ๆ) */
    select: {
        width: '100%',
        padding: '11px 36px 11px 13px',
        borderRadius: '10px',
        backgroundColor: '#0f1a30',
        border: '1px solid #2a3a5c',
        color: '#f8fafc',
        outline: 'none',
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%237c8db0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5 6 6.5l5-5'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 13px center',
        transition: 'border-color .15s ease',
    },
    /* ป้ายหัวช่องเล็ก ๆ ใช้นำหน้ากลุ่มตั้งค่าในแผงข้าง */
    fieldLabel: {
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: '#8999b0',
        marginBottom: '6px',
        display: 'block',
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
    /* ป้ายรายละเอียดจุดเควส — วางลอยเหนือหมุด ไม่ทับตัวจุดและจุดข้างเคียง
       ของเดิมกว้างตายตัว 300px พื้นดำทึบ + เรืองแสงขาวรอบกล่อง เลยบังแมพเป็นวงกว้าง */
    descriptionMarker: {
        position: 'absolute',
        width: 'max-content',
        /* กว้างขึ้นให้ป้ายกุญแจกับปุ่ม Done ยืนแถวเดียวกันได้ไม่เบียด
           minWidth กันป้ายที่คำอธิบายสั้น ๆ หดจนแถวล่างตกบรรทัด */
        minWidth: '215px',
        maxWidth: '330px',
        padding: '7px 9px',
        borderRadius: '8px',
        border: '1px solid rgba(148,180,230,0.45)',
        background: 'rgba(12,19,36,0.93)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
        zIndex: 30,
        textAlign: 'left',
        fontSize: '15px',
        fontWeight: 600,
        lineHeight: 1.4,
        color: '#e6efff',
        cursor: 'pointer',
    },
    /* ลูกศรเล็กชี้ลงไปที่หมุด ให้รู้ว่าป้ายเป็นของจุดไหนตอนมีหลายจุดใกล้กัน */
    descriptionArrow: {
        position: 'absolute',
        left: '50%',
        bottom: '-5px',
        width: '9px',
        height: '9px',
        transform: 'translateX(-50%) rotate(45deg)',
        background: 'rgba(12,19,36,0.93)',
        borderRight: '1px solid rgba(148,180,230,0.45)',
        borderBottom: '1px solid rgba(148,180,230,0.45)',
    },
    descriptionDone: {
        marginTop: '7px',
        padding: '4px 10px',
        borderRadius: '6px',
        border: '1px solid #22c55e',
        background: 'rgba(34,197,94,0.16)',
        color: '#6ee7a8',
        fontSize: '13.5px',
        fontWeight: 800,
        letterSpacing: '.04em',
        cursor: 'pointer',
        alignSelf: 'flex-end',
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
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'black',
        cursor: 'help'
    },
    mapLabel: {
        marginTop: '2px',
        maxWidth: '90px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '11.5px',
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(3, 7, 18, 0.82)',
        border: '1px solid #64748b',
        borderRadius: '4px',
        padding: '0 4px',
        lineHeight: '13px',
        textAlign: 'center',
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
        fontSize: '12px',
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
        fontSize: '14px',
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
        fontSize: '14px',
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
        fontSize: '13px',
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
        backgroundColor: '#0b1120',
        border: '1px solid #334155',
        borderRadius: '4px',
        color: '#60a5fa',
        fontSize: '13px',
        padding: '2px 4px',
        outline: 'none',
    },
    btnSmall: {
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '4px'
    },
};

// --- Ammo Theme ---
export const AmmoStyles = {
    container: {
        minHeight: '93vh',
        backgroundColor: '#0b1120', // zinc-950
        color: '#e2e8f0', // zinc-100
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    header: {
        backgroundColor: '#16213a',
        borderBottom: '1px solid #2b3a52',
        position: 'sticky',
        // เกาะใต้ navbar ที่หนึบอยู่แล้ว ไม่ใช่ top: 0 ซึ่งจะมุดเข้าไปใต้ navbar
        // (--ammo-nav วัดจริงใน Balistic.jsx เพราะ navbar ยุบ/ขยายตามความกว้างจอ)
        top: 'var(--ammo-nav, 0px)',
        zIndex: 30,
        // เงาอยู่ใน ammo.css (.ammo-head-bar) เพราะต้องอ้าง --ammo-gap ร่วมกับหัวตาราง
    },
    headerInner: {
        maxWidth: '82rem',
        margin: '0 auto',
        padding: '12px 16px 10px',
    },
    headerTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '10px',
    },
    logoSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    logoIcon: {
        width: '2.25rem',
        height: '2.25rem',
        backgroundColor: 'rgba(234, 179, 8, 0.12)',
        border: '1px solid rgba(234, 179, 8, 0.35)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.colors.accent,
    },
    title: {
        fontSize: '1.15rem',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: theme.colors.textMain,
        lineHeight: 1.1,
        margin: 0,
    },
    subtitle: {
        fontSize: '0.7rem',
        color: '#8999b0',
        margin: '2px 0 0',
    },
    searchContainer: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '10px',
        color: '#8999b0',
        pointerEvents: 'none',
    },
    searchInput: {
        width: '15rem',
        maxWidth: '100%',
        backgroundColor: '#0b1120',
        border: '1px solid #2b3a52',
        fontSize: '0.85rem',
        borderRadius: '7px',
        padding: '8px 12px 8px 32px',
        outline: 'none',
        color: theme.colors.textMain,
        transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    /* ชิปเลือก caliber — แทน dropdown เดิม เห็นตัวเลือกทั้งหมดพร้อมจำนวนโดยไม่ต้องกด */
    chip: (active) => ({
        padding: '5px 11px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        border: `1px solid ${active ? theme.colors.accent : '#2b3a52'}`,
        background: active ? 'rgba(234, 179, 8, 0.15)' : '#131d33',
        color: active ? theme.colors.accent : '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background-color 0.12s, border-color 0.12s',
    }),
    chipCount: {
        fontSize: '0.65rem',
        opacity: 0.65,
        fontVariantNumeric: 'tabular-nums',
    },
    main: {
        maxWidth: '82rem',
        margin: '0 auto',
        padding: '14px 16px 32px',
    },
    /* คำอธิบายคะแนน 0-6 แบบแถบเดียว — ของเดิมเป็นกล่อง 7 ช่องพร้อมปุ่มเปิด/ปิด
       ซึ่งกินที่จนต้องซ่อน พอซ่อนแล้วก็อ่านตัวเลขในตารางไม่ออก ย่อให้เหลือ
       บรรทัดเดียวแล้วโชว์ค้างไว้ จะได้ไม่ต้องจำและไม่ต้องมีปุ่ม */
    legendStrip: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        padding: '8px 11px',
        background: '#131d33',
        border: '1px solid #2b3a52',
        borderRadius: '8px',
        marginBottom: '10px',
        fontSize: '0.7rem',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        color: '#94a3b8',
        whiteSpace: 'nowrap',
    },
    legendSwatch: {
        width: '15px',
        height: '15px',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.6rem',
        fontWeight: 700,
        flexShrink: 0,
    },
    summaryBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexWrap: 'wrap',
        marginBottom: '8px',
        fontSize: '0.75rem',
        color: '#8999b0',
    },
    resetButton: {
        background: 'none',
        border: '1px solid #2b3a52',
        borderRadius: '6px',
        padding: '4px 10px',
        color: '#94a3b8',
        fontSize: '0.7rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    /* ห้ามใส่ overflow: hidden ตรงนี้ — มันสร้าง scroll container เหมือน overflow-x: auto
       แล้วหัวตารางที่ sticky จะยึดกับกล่องนี้แทนที่จะยึดกับจอ เลยไม่หนึบเลย
       มุมมนทำที่เซลล์หัว/ท้ายใน ammo.css แทนการ clip ที่กล่อง */
    // ใช้กับกรณีไม่มีผลลัพธ์เท่านั้น — ตัวตารางวาดขอบและมุมมนเองที่เซลล์ (ammo.css)
    tableContainer: {
        backgroundColor: '#1e293b',
        border: '1px solid #2b3a52',
        borderRadius: '10px',
    },
    /* ไม่ตั้ง padding ตรงนี้ — inline style ชนะ CSS เสมอ แล้ว media query
       ที่ลดช่องไฟบนจอแคบใน ammo.css จะไม่มีผลเลย ปล่อยให้ CSS คุมฝั่งเดียว */
    th: {
        fontWeight: '600',
        fontSize: '0.7rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        textAlign: 'left',
        color: '#94a3b8',
        userSelect: 'none',
    },
    td: {
        color: '#e2e8f0',
    },
    nameCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    iconCell: {
        width: '2rem',
        height: '2rem',
        backgroundColor: '#0b1120',
        borderRadius: '5px',
        border: '1px solid #2b3a52',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
    },
    /* หัวคร่อมบอกว่าคอลัมน์ 1-6 คือ armor class — ของเดิมมีแค่เลขลอย ๆ ไม่มีอะไรบอก */
    groupHeader: {
        textAlign: 'center',
        color: '#8999b0',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    armorHeader: {
        fontWeight: '700',
        textAlign: 'center',
        width: '2.4rem',
        fontSize: '0.75rem',
        color: '#cbd5e1',
        userSelect: 'none',
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
        backgroundColor: '#1e293b', // zinc-900
        border: '1px solid #475569', // zinc-700
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
        color: '#94a3b8', // zinc-400
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
        backgroundColor: '#0b1120', // zinc-950
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #334155', // zinc-800
    },
    pill: {
        padding: '0.25rem 0.75rem',
        backgroundColor: '#334155', // zinc-800
        color: '#cbd5e1', // zinc-300
        borderRadius: '9999px',
        fontSize: '0.875rem',
        border: '1px solid #475569', // zinc-700
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
        color: '#cbd5e1', // zinc-300
        borderBottom: '1px solid #475569', // zinc-700
        paddingBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
    },
    statBox: {
        backgroundColor: 'rgba(51, 65, 85, 0.4)', // slate-700/40
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid rgba(71, 85, 105, 0.5)', // slate-600/50
    },
    statLabel: {
        color: '#8999b0', // zinc-500
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
        borderBottom: '1px solid #334155', // zinc-800
    },
    /* แถบเกราะย่อใน modal — เปิดดูรายละเอียดแล้วยังเห็นว่ากระสุนนี้เอาอยู่ถึง class ไหน
       โดยไม่ต้องปิด modal กลับไปดูตาราง */
    modalArmorRow: {
        display: 'flex',
        gap: '6px',
        marginTop: '10px',
        flexWrap: 'wrap',
    },
    modalArmorCell: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        fontSize: '0.6rem',
        color: '#8999b0',
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
    ChevronRight: (p) => <Icon {...p}><path d="M9 18l6-6-6-6" /></Icon>,
    ChevronLeft: (p) => <Icon {...p}><path d="M15 18l-6-6 6-6" /></Icon>,
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
    AlertTriangle: (p) => <Icon {...p}><path d="M12 2l10 20h-20l10-20z" /></Icon>,
    Weight: (p) => <Icon {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></Icon>,
    Activity: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" strokeLinecap="round" /></Icon>,
    Ban: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></Icon>,
};

export const TRADER_THEMES = {
    "Any": { bg: "#00ccff", border: "#000000", text: "#ffffff" }, // ฟ้า
    "Prapor": { bg: "#7b1fa2", border: "#e1bee7", text: "#ffffff" }, // ม่วงสด
    "Therapist": { bg: "#0288d1", border: "#81d4fa", text: "#ffffff" }, // ฟ้าสด
    "Skier": { bg: "#f57c00", border: "#ffe0b2", text: "#ffffff" }, // ส้มสด
    "Peacekeeper": { bg: "#2e7d32", border: "#a5d6a7", text: "#ffffff" }, // เขียวเข้มทหาร
    "Mechanic": { bg: "#D34E4E", border: "#ffcdd2", text: "#ffffff" }, // แดงชมพู (ตามที่คุณชอบแต่สดขึ้น)
    "Ragman": { bg: "#c2185b", border: "#f8bbd0", text: "#ffffff" }, // ชมพูบานเย็น
    "Jaeger": { bg: "#689f38", border: "#dcedc8", text: "#ffffff" }, // เขียวสว่าง
    "Fence": { bg: "#5d4037", border: "#d7ccc8", text: "#ffffff" }, // น้ำตาลเข้ม
    "Lightkeeper": { bg: "#ffea00ff", border: "#f57f17", text: "#000000" }, // เหลืองทองสว่าง (Text ดำ)
    // คีย์ต้องเป็น "Btr Driver" ตามที่ titleCase('btr-driver') คายออกมา
    // เขียน "BTR Driver" ไว้จะหาไม่เจอ แล้วตกไปใช้สีเทาเริ่มต้นแทน
    "Btr Driver": { bg: "#ffeb3b", border: "#212121", text: "#000000" }, // เหลือง Taxi/Hazard (เด่นที่สุด)
    "Ref": { bg: "#d32f2f", border: "#ffcdd2", text: "#ffffff" }, // แดงสด Arena
};