import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Badge from 'react-bootstrap/Badge';

import { NavLink } from 'react-router-dom';

import { GiHomeGarage, GiPc, GiTreeGrowth, GiTrophy, GiMachineGunMagazine, GiProgression } from 'react-icons/gi';
import { FaGem, FaMap, FaQrcode, FaTools } from 'react-icons/fa';
import { kappaStyles as styles, COLORS } from './EftComponent';
import BEAR from '/BEAR_Icon.webp';
import USEC from '/USEC_Emblem.webp';

const RESET = ["All", "Questline", "Hideout"];

function AppNavbar() {

    const mainNavLinks = [
        { key: "#/", href: "/", icon: FaGem, text: "Home", subLinks: [] },
        { key: "#/AddQuest", href: "/AddQuest", icon: FaQrcode, text: "Add Quest", subLinks: [] },
        { key: "#/Map", href: "/Map", icon: FaMap, text: "Map", subLinks: [] },
        {
            key: "#/Progressions", href: "", icon: GiProgression, text: "Progressions", subLinks: [
                { key: "#/Kappa", href: "/Kappa", icon: GiTrophy, text: "Kappa" },
                { key: "#/QuestTree", href: "/QuestTree", icon: GiTreeGrowth, text: "Quest Tree" },
                { key: "#/Hideout", href: "/Hideout", icon: GiHomeGarage, text: "Hideout" }]
        },
        {
            key: "#/Tools", href: "", icon: FaTools, text: "Tools", subLinks: [
                { key: "#/Balistic", href: "/Balistic", icon: GiMachineGunMagazine, text: "Balistic" }]
        },

    ];
    // { key: "#/", href: "/", icon: FaGem, text: "Home" },
    // { key: "#/AddQuest", href: "/AddQuest", icon: FaQrcode, text: "Add Quest" },
    // { key: "#/Map", href: "/Map", icon: FaMap, text: "Map" },
    // { key: "#/Kappa", href: "/Kappa", icon: GiTrophy, text: "Kappa" },
    // { key: "#/QuestTree", href: "/QuestTree", icon: GiTreeGrowth, text: "Quest Tree" },
    // { key: "#/Hideout", href: "/Hideout", icon: GiHomeGarage, text: "Hideout" },
    // { key: "#/Balistic", href: "/Balistic", icon: GiMachineGunMagazine, text: "Balistic" },

    // ];

    const settingsNavLinks = [

    ];

    const [showResetModal, setShowResetModal] = useState(false);
    const [selectReset, setSelectReset] = useState([]);

    const [factionName, setFactionName] = useState(() => {
        const saveFaction = localStorage.getItem('eft_faction_name');
        return saveFaction ? JSON.parse(saveFaction) : 'BEAR'
    });

    const ToggleFaction = () => {
        if (factionName === 'BEAR') setFactionName('USEC')
        else setFactionName('BEAR');
    };

    const handleResetClick = () => {
        setShowResetModal(true);
    };

    useEffect(() => {
        localStorage.setItem('eft_faction_name', JSON.stringify(factionName));
    }, [factionName]);

    const onChangeSelectReset = (value) => {
        if (value === "All") {
            setObjectiveLocations([]);
            return;
        }
        setSelectReset((prev) =>
            prev.includes(value)
                ? prev.filter((t) => t !== value)
                : [...prev, value]);
    };

    const cancelReset = () => {
        setSelectReset([]);
        setShowResetModal(false);
    };

    const confirmReset = () => {
        if (selectReset.length === 0) {
            localStorage.clear();
        } else {
            selectReset.forEach((value) => {
                if (value === "Questline") {
                    localStorage.removeItem('eft_selected_quests');
                    localStorage.removeItem('eft_objective_checklist');
                    localStorage.removeItem('eft_completed_quests');
                    localStorage.removeItem('eft_select_quest_hidden');
                } else if (value === "Hideout") {
                    localStorage.removeItem('eft_hideout');
                }
            });
        }

        window.dispatchEvent(new Event("storage"));
        setShowResetModal(false);
        setSelectReset([]);
    }

    const activeStyle = {
        borderBottom: '3px solid #0dcaf0', // Using Bootstrap 'info' color
        color: 'white' // Ensure text is white when active on dark background
    };
    const inactiveStyle = {
    };
    const renderNavLinkContent = (item) => (
        <>
            {item.icon && <item.icon className="me-2" />}
            <span>{item.text}</span>
            {item.count !== undefined && (
                <Badge pill bg="secondary" className="ms-2">
                    {item.count}
                </Badge>
            )}
        </>
    );

    return (
        <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark" sticky="top" >
            <Container fluid>
                <Navbar.Brand as={NavLink} to="/">
                    <GiPc size="1.5em" className="me-2" />
                    EFT TaskTrack
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto text-center" >
                        {mainNavLinks.map((item) => (
                            item.subLinks.length === 0 ? (
                                <Nav.Link
                                    key={item.key}
                                    as={NavLink}
                                    to={item.href}
                                    style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                                    className='d-flex align-items-center'
                                >
                                    {renderNavLinkContent(item)}
                                </Nav.Link>
                            )
                                : (
                                    <Nav.Link className='d-flex align-items-center' key={item.key}>
                                        <item.icon />
                                        <NavDropdown title={item.text} id={`${item.key}-nav-dropdown`}>
                                            {item.subLinks.map((subItem) => (
                                                <NavDropdown.Item key={subItem.key} to={subItem.href} as={NavLink}
                                                    style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                                                >
                                                    {renderNavLinkContent(subItem)}
                                                </NavDropdown.Item>
                                            ))}
                                        </NavDropdown>
                                    </Nav.Link>
                                )
                        ))}
                    </Nav>
                    <Nav>
                        {settingsNavLinks.map((item) => (
                            <Nav.Link
                                key={item.key}
                                as={NavLink} // Render Nav.Link as NavLink
                                to={item.href} // Use 'to' prop for destination path
                                style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                            >
                                {renderNavLinkContent(item)}
                            </Nav.Link>
                        ))}

                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '0.5rem' }}>
                            <img
                                onClick={() => ToggleFaction()}
                                src={`${factionName === 'BEAR' ? BEAR : USEC}`}
                                alt={`${factionName} Icon`}
                                style={{
                                    height: '40px', // Set a fixed height for stability
                                    width: 'auto',  // Maintain aspect ratio
                                    padding: '0 0.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                }}
                            />

                            <button
                                onClick={handleResetClick}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    backgroundColor: 'transparent',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    height: '40px',
                                }}
                                title="Reset Progress"
                            >
                                RESET
                            </button>
                        </div>
                    </Nav>
                </Navbar.Collapse>
                {/* Custom Reset Modal */}
                {showResetModal && (
                    <div style={styles.modalOverlayStyle}>
                        <div style={styles.modalContentStyle}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: COLORS.textPrimary }}>Reset Progress?</h3>
                            <p style={{ color: COLORS.textSecondary, lineHeight: '1.5' }}>
                                This will clear your progress locally. This action cannot be undone.
                            </p>
                            <div style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', }}>
                                {RESET.map((value) => {
                                    const active = value === "All" ? selectReset.length === 0 : selectReset.includes(value);

                                    return (
                                        <label
                                            key={value}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                                color: '#64748b', fontSize: '14px', fontWeight: '500', padding: '4px 8px',
                                                borderRadius: '4px', border: `1px solid #334155`, backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                            }}>
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={() => onChangeSelectReset(value)}
                                                style={{ accentColor: '#f97316', width: '16px', height: '16px', cursor: 'pointer', }}
                                            />
                                            <span style={{ fontSize: '12px' }}>{value}</span>
                                        </label>
                                    )
                                })}
                            </div>
                            <div style={styles.modalButtonsContainerStyle}>
                                <button onClick={cancelReset} style={styles.modalCancelButtonStyle}>
                                    Cancel
                                </button>
                                <button onClick={confirmReset} style={styles.modalConfirmButtonStyle}>
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Container>
        </Navbar>
    );
}

export default AppNavbar;