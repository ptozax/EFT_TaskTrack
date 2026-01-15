import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Badge from 'react-bootstrap/Badge';

import { NavLink } from 'react-router-dom';

import { GiPc, GiTreeGrowth, GiTrophy } from 'react-icons/gi';
import { FaGem, FaMap, FaQrcode } from 'react-icons/fa';


function AppNavbar() {


    const mainNavLinks = [
        { key: "#/", href: "/", icon: FaGem, text: "Home" },
        { key: "#/AddQuest", href: "/AddQuest", icon: FaQrcode, text: "Add Quest" },
        { key: "#/Map", href: "/Map", icon: FaMap, text: "Map" },
        { key: "#/Kappa", href: "/Kappa", icon: GiTrophy, text: "Kappa" },
        { key: "#/QuestTree", href: "/QuestTree", icon: GiTreeGrowth, text: "Quest Tree" },

    ];

    const settingsNavLinks = [

    ];

    const resetQuest = () => {
        localStorage.removeItem('eft_selected_quests');
        localStorage.removeItem('eft_objective_checklist');
        localStorage.removeItem('eft_completed_quests');
        localStorage.removeItem('eft_select_quest_hidden');

        window.dispatchEvent(new Event("storage"));
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
                        <button
                            onClick={resetQuest}
                            style={{
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
                            }}
                            title="Reset Progress"
                        >
                            RESET
                        </button>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default AppNavbar;