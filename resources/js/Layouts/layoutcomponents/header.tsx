import { useEffect, useRef, useCallback } from "react";
import { Nav, Dropdown, Navbar } from "react-bootstrap";
import { Link, usePage } from "@inertiajs/react";
import { Imagesdata } from "../../commondata/commonimages";

const Header = () => {
    const user = usePage().props.auth.user;

    // --- Handlers memorizados ---
    const handleSideMenuToggle = useCallback(() => {
        document.querySelector(".app")?.classList.toggle("sidenav-toggled");
    }, []);

    const handleDarkMode = useCallback(() => {
        const body = document.body;
        if (body.classList.contains("dark-mode")) {
            body.classList.remove("dark-mode");
            localStorage.removeItem("sashdarktheme");
            localStorage.removeItem("sashlightmode");
            localStorage.removeItem("sashlightheader");
            // posible typo original: "sashlighmenu"
            localStorage.removeItem("sashlightmenu");
        } else {
            body.classList.add("dark-mode");
            localStorage.setItem("sashdarktheme", "true");
            localStorage.removeItem("sashlightmode");
            localStorage.removeItem("sashlightheader");
            localStorage.removeItem("sashlightmenu");
        }
    }, []);

    // Fullscreen state control (sin variable global)
    const isFsRef = useRef(false);
    const fsToggle = useCallback(async () => {
        const doc: any = document;
        const el: any = document.documentElement;

        if (!isFsRef.current) {
            try {
                if (el.requestFullscreen) await el.requestFullscreen();
                else if (el.webkitRequestFullscreen)
                    await el.webkitRequestFullscreen();
                else if (el.msRequestFullscreen) await el.msRequestFullscreen();
                isFsRef.current = true;
            } catch {}
        } else {
            try {
                if (doc.exitFullscreen) await doc.exitFullscreen();
                else if (doc.webkitExitFullscreen)
                    await doc.webkitExitFullscreen();
                else if (doc.msExitFullscreen) await doc.msExitFullscreen();
            } finally {
                isFsRef.current = false;
            }
        }
    }, []);

    const handleSwitcherToggle = useCallback(() => {
        const right = document.querySelector<HTMLDivElement>(".demo_changer");
        right?.classList.toggle("active");
        if (right) right.style.insetInlineEnd = "0px";
    }, []);

    // Ocultar resultados de búsqueda al hacer click en main-content (una sola vez)
    useEffect(() => {
        const main = document.querySelector(".main-content");
        const hide = () =>
            document.querySelector(".search-result")?.classList.add("d-none");
        main?.addEventListener("click", hide);
        return () => main?.removeEventListener("click", hide);
    }, []);

    // --- RENDER ---
    return (
        <div className="">
            <div className="header sticky app-header header1">
                <div className="container-fluid main-container">
                    <div className="d-flex">
                        <div
                            aria-label="Ocultar/mostrar sidebar"
                            className="app-sidebar__toggle"
                            data-bs-toggle="sidebar"
                            onClick={handleSideMenuToggle}
                            style={{ cursor: "pointer" }}
                        />

                        <Link
                            className="logo-horizontal"
                            href="/dashboard"
                            aria-label="Inicio"
                        >
                            {/* Contenedor con tamaño fijo para evitar CLS */}
                            <span
                                className="header-brand"
                                style={{
                                    display: "inline-block",
                                    width: 160,
                                    height: 40,
                                }}
                            >
                                {/* Si tienes versión webp, puedes envolver en <picture>. Aquí mantengo tus dos <img> pero con tamaño fijo */}
                                <img
                                    src={Imagesdata("buapBlanco")}
                                    className="header-brand-img desktop-logo"
                                    alt="BUAP"
                                    width={160}
                                    height={40}
                                    decoding="async"
                                />
                                <img
                                    src={Imagesdata("buapBlanco")}
                                    className="header-brand-img light-logo1"
                                    alt="BUAP"
                                    width={160}
                                    height={40}
                                    decoding="async"
                                />
                            </span>
                        </Link>

                        <Navbar className="d-flex order-lg-2 ms-auto header-right-icons">
                            <Navbar.Toggle className="d-lg-none ms-auto header2">
                                <span className="navbar-toggler-icon fe fe-more-vertical" />
                            </Navbar.Toggle>

                            <div className="responsive-navbar p-0">
                                <Navbar.Collapse id="navbarSupportedContent-4">
                                    <div className="d-flex order-lg-2">
                                        {/* Dark Mode */}
                                        <div className="dropdown d-flex">
                                            <Nav.Link
                                                className="nav-link icon theme-layout nav-link-bg layout-setting"
                                                onClick={handleDarkMode}
                                                aria-label="Cambiar tema"
                                            >
                                                <span className="dark-layout">
                                                    <i className="fe fe-moon" />
                                                </span>
                                                <span className="light-layout">
                                                    <i className="fe fe-sun" />
                                                </span>
                                            </Nav.Link>
                                        </div>

                                        {/* FullScreen */}
                                        <div className="dropdown d-flex">
                                            <Nav.Link
                                                className="nav-link icon full-screen-link nav-link-bg"
                                                onClick={fsToggle}
                                                aria-label="Pantalla completa"
                                            >
                                                <i className="fe fe-minimize fullscreen-button" />
                                            </Nav.Link>
                                        </div>

                                        {/* Perfil */}
                                        <Dropdown className="d-flex profile-1">
                                            <Dropdown.Toggle
                                                variant=""
                                                className="nav-link leading-none d-flex no-caret"
                                            >
                                                <img
                                                    src={Imagesdata("user")}
                                                    alt="Usuario"
                                                    className="avatar profile-user brround cover-image"
                                                    width={36}
                                                    height={36}
                                                    decoding="async"
                                                    loading="lazy"
                                                />
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="dropdown-menu-end dropdown-menu-arrow">
                                                <div className="drop-heading">
                                                    <div className="text-center">
                                                        <h5 className="text-dark mb-0 fs-14 fw-semibold">
                                                            {user.name}
                                                        </h5>
                                                        <small className="text-muted">
                                                            {/* Subtítulo opcional */}
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

                            {/* Switcher */}
                            <div
                                className="demo-icon nav-link icon"
                                onClick={handleSwitcherToggle}
                                role="button"
                                aria-label="Abrir switcher"
                            >
                                <i className="fe fe-settings fa-spin text_primary" />
                            </div>
                        </Navbar>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
