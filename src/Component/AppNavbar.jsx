import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Badge from 'react-bootstrap/Badge';


import { NavLink } from 'react-router-dom';


import { GiDiamondRing, GiBroadsword } from 'react-icons/gi';
import { FaGem, FaUsers, FaArchive, FaTools, FaQrcode, FaBook, FaCog, FaDatabase } from 'react-icons/fa';


function AppNavbar() {


    const mainNavLinks = [
        { key: "#/", href: "/", icon: FaGem, text: "Home" },
    
    ];

    const settingsNavLinks = [
   
    ];


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
                    <GiDiamondRing size="1.5em" className="me-2" />
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
                                style={({ isActive }) => isActive ? activeStyle : inactiveStyle }
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
                                style={({ isActive }) => isActive ? activeStyle : inactiveStyle }
                            >
                                {renderNavLinkContent(item)}
                            </Nav.Link>
                        ))}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default AppNavbar;