import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Badge from 'react-bootstrap/Badge';

import { NavLink } from 'react-router-dom';

import { GiHomeGarage, GiPc, GiTreeGrowth, GiTrophy } from 'react-icons/gi';
import { FaGem, FaMap, FaQrcode } from 'react-icons/fa';
import { styles, COLORS } from './KappaComponent';
import BEAR from '/BEAR_Icon.webp';
import USEC from '/USEC_Emblem.webp';


function AppNavbar() {

    const mainNavLinks = [
        { key: "#/", href: "/", icon: FaGem, text: "Home" },
        { key: "#/AddQuest", href: "/AddQuest", icon: FaQrcode, text: "Add Quest" },
        { key: "#/Map", href: "/Map", icon: FaMap, text: "Map" },
        { key: "#/Kappa", href: "/Kappa", icon: GiTrophy, text: "Kappa" },
        { key: "#/QuestTree", href: "/QuestTree", icon: GiTreeGrowth, text: "Quest Tree" },
        { key: "#/Hideout", href: "/Hideout", icon: GiHomeGarage, text: "Hideout" },

    ];

    const settingsNavLinks = [

    ];

    const [showResetModal, setShowResetModal] = useState(false);


    const handleResetClick = () => {
        setShowResetModal(true);
    };

    const [factionName, setFactionName] = useState(() => {
        const saveFaction = localStorage.getItem('eft_faction_name');
        return saveFaction ? JSON.parse(saveFaction) : 'BEAR'
    });
    const ToggleFaction = () => {
        if (factionName === 'BEAR') setFactionName('USEC')
        else setFactionName('BEAR');
    };

    useEffect(() => {
        localStorage.setItem('eft_faction_name', JSON.stringify(factionName));
    }, [factionName]);

    const cancelReset = () => {
        setShowResetModal(false);
    };

    const confirmReset = () => {
        localStorage.removeItem('eft_selected_quests');
        localStorage.removeItem('eft_objective_checklist');
        localStorage.removeItem('eft_completed_quests');
        localStorage.removeItem('eft_select_quest_hidden');

        window.dispatchEvent(new Event("storage"));
        setShowResetModal(false);
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
                            <Nav.Link
                                key={item.key}
                                as={NavLink}
                                to={item.href}
                                style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                            >
                                {renderNavLinkContent(item)}
                            </Nav.Link>
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
                                This will uncheck all quests and clear your progress locally. This action cannot be undone.
                            </p>
                            <div style={styles.modalButtonsContainerStyle}>
                                <button onClick={cancelReset} style={styles.modalCancelButtonStyle}>
                                    Cancel
                                </button>
                                <button onClick={confirmReset} style={styles.modalConfirmButtonStyle}>
                                    Yes, Reset All
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