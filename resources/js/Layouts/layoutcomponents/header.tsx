import { useState } from "react";
import { Nav, Dropdown, Navbar } from "react-bootstrap";
import { Link, usePage } from "@inertiajs/react";
import { Imagesdata } from "../../commondata/commonimages";

const SideMenuIcon: any = () => {
    //leftsidemenu
    document.querySelector(".app")?.classList.toggle("sidenav-toggled");
};
// Darkmode
const DarkMode = () => {
    if (document.querySelector("body")?.classList.contains("dark-mode")) {
        document.querySelector("body")?.classList.remove("dark-mode");

        localStorage.removeItem("sashdarktheme");
        localStorage.removeItem("sashlightmode");
        localStorage.removeItem("sashlightheader");
        localStorage.removeItem("sashlighmenu");
    } else {
        document.querySelector("body")?.classList.add("dark-mode");
        localStorage.setItem("sashdarktheme", "true");
        localStorage.removeItem("sashlightmode");
        localStorage.removeItem("sashlightheader");
        localStorage.removeItem("sashlighmenu");
    }
};

// FullScreen
var elem: any = document.documentElement;
var i = true;
const Fullscreen: any = (vale: any) => {
    switch (vale) {
        case true:
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                /* Safari */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                /* IE11 */
                elem.msRequestFullscreen();
            }
            i = false;
            break;
        case false:
            document.exitFullscreen();
            i = true;
            break;
    }
};

// SwitcherMenu

const SidSwitcherIcon: any = () => {
    //leftsidemenu
    document.querySelector(".demo_changer")?.classList.toggle("active");
    let Rightside: any = document.querySelector(".demo_changer");
    Rightside.style.insetInlineEnd = "0px";
};

const Header = () => {
    document.querySelector(".main-content")?.addEventListener("click", () => {
        document.querySelector(".search-result")?.classList.add("d-none");
    });

    const user = usePage().props.auth.user;

    return (
        <div className="">
            <div className="header sticky app-header header1">
                <div className="container-fluid main-container">
                    <div className="d-flex">
                        <div
                            aria-label="Hide Sidebar"
                            className="app-sidebar__toggle"
                            data-bs-toggle="sidebar"
                            onClick={() => SideMenuIcon()}
                            style={{ cursor: "pointer" }}
                        />
                        <Link className="logo-horizontal " href="/dashboard">
                            <img
                                src={Imagesdata("buapBlanco")}
                                className="header-brand-img desktop-logo"
                                alt="logo"
                            />
                            <img
                                src={Imagesdata("buapBlanco")}
                                className="header-brand-img light-logo1"
                                alt="logo"
                            />
                        </Link>

                        <Navbar className="d-flex order-lg-2 ms-auto header-right-icons">
                            <Navbar.Toggle className="d-lg-none ms-auto header2">
                                <span className="navbar-toggler-icon fe fe-more-vertical"></span>
                            </Navbar.Toggle>

                            <div className="responsive-navbar p-0">
                                <Navbar.Collapse
                                    className=""
                                    id="navbarSupportedContent-4"
                                >
                                    <div className="d-flex order-lg-2">
                                        {/* Dark Mode */}

                                        <div className="dropdown  d-flex">
                                            <Nav.Link
                                                className="nav-link icon theme-layout nav-link-bg layout-setting"
                                                onClick={() => DarkMode()}
                                            >
                                                <span className="dark-layout">
                                                    <i className="fe fe-moon"></i>
                                                </span>
                                                <span className="light-layout">
                                                    <i className="fe fe-sun"></i>
                                                </span>
                                            </Nav.Link>
                                        </div>

                                        {/* <!-- Shopping-Cart Theme-Layout --> */}

                                        {/* FullScreen button */}

                                        <div className="dropdown d-flex">
                                            <Nav.Link
                                                className="nav-link icon full-screen-link nav-link-bg"
                                                onClick={() => Fullscreen(i)}
                                            >
                                                <i className="fe fe-minimize fullscreen-button"></i>
                                            </Nav.Link>
                                        </div>

                                        {/* Profile  */}

                                        <Dropdown className="d-flex profile-1">
                                            <Dropdown.Toggle
                                                variant=""
                                                className="nav-link leading-none d-flex no-caret"
                                            >
                                                <img
                                                    src={Imagesdata("user")}
                                                    alt="profile-user"
                                                    className="avatar  profile-user brround cover-image"
                                                />
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="dropdown-menu-end dropdown-menu-arrow">
                                                <div className="drop-heading">
                                                    <div className="text-center">
                                                        <h5 className="text-dark mb-0 fs-14 fw-semibold">
                                                            {user.name}
                                                        </h5>
                                                        <small className="text-muted">
                                                            {/* Sub titulo */}
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="dropdown-divider m-0"></div>
                                                <Link
                                                    className="dropdown-item"
                                                    href={route("profile.edit")}
                                                >
                                                    <i className="dropdown-icon fe fe-user"></i>{" "}
                                                    Mi perfil
                                                </Link>

                                                <Link
                                                    className="dropdown-item"
                                                    href={route("logout")}
                                                    method="post"
                                                >
                                                    <i className="dropdown-icon fe fe-alert-circle"></i>{" "}
                                                    Cerrar Sesión
                                                </Link>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                </Navbar.Collapse>
                            </div>

                            {/* Switcher  */}

                            <div
                                className="demo-icon nav-link icon"
                                onClick={() => SidSwitcherIcon()}
                            >
                                <i className="fe fe-settings fa-spin  text_primary"></i>
                            </div>
                        </Navbar>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
