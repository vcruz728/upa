import { Fragment, useEffect, useState } from "react";
import { MENUITEMS } from "../../commondata/Sidemenu";
import { Imagesdata } from "../../commondata/commonimages";
import { Link, usePage } from "@inertiajs/react";
import { getFullUrl } from "../../types/url";

const Onhover = () => {
    if (document.querySelector(".app")?.classList.contains("sidenav-toggled"))
        document.querySelector(".app")?.classList.add("sidenav-toggled-open");
};
const Outhover = () => {
    document.querySelector(".app")?.classList.remove("sidenav-toggled-open");
};

export const Sidebar = () => {
    const user = usePage().props.auth.user;
    const [menuitems, setMenuitems] = useState(MENUITEMS);

    // location
    useEffect(() => {
        if (
            document.body.classList.contains("horizontal") &&
            window.innerWidth >= 992
        ) {
            clearMenuActive();
        }
    }, []);

    function clearMenuActive() {
        MENUITEMS.map((mainlevel) => {
            if (mainlevel.Items) {
                mainlevel.Items.map((sublevel: any) => {
                    sublevel.active = false;
                    if (sublevel.children) {
                        sublevel.children.map((sublevel1: any) => {
                            sublevel1.active = false;
                            if (sublevel1.children) {
                                sublevel1.children.map((sublevel2: any) => {
                                    sublevel2.active = false;
                                    return sublevel2;
                                });
                            }
                            return sublevel1;
                        });
                    }
                    return sublevel;
                });
            }
            return mainlevel;
        });

        setMenuitems((arr) => [...arr]);
    }

    function toggleSidemenu(item: any) {
        if (
            !document.body.classList.contains("horizontal-hover") ||
            window.innerWidth < 992
        ) {
            // To show/hide the menu
            if (!item.active) {
                menuitems.map((mainlevel) => {
                    if (mainlevel.Items) {
                        mainlevel.Items.map((sublevel: any) => {
                            sublevel.active = false;
                            if (item === sublevel) {
                                sublevel.active = true;
                            }
                            if (sublevel.children) {
                                sublevel.children.map((sublevel1: any) => {
                                    sublevel1.active = false;
                                    if (item === sublevel1) {
                                        sublevel.active = true;
                                        sublevel1.active = true;
                                    }
                                    if (sublevel1.children) {
                                        sublevel1.children.map(
                                            (sublevel2: any) => {
                                                sublevel2.active = false;
                                                if (item === sublevel2) {
                                                    sublevel.active = true;
                                                    sublevel1.active = true;
                                                    sublevel2.active = true;
                                                }
                                                return sublevel2;
                                            }
                                        );
                                    }
                                    return sublevel1;
                                });
                            }
                            return sublevel;
                        });
                    }
                    return mainlevel;
                });
            } else {
                item.active = !item.active;
            }
        }

        setMenuitems((arr) => [...arr]);
    }
    return (
        <Fragment>
            <div
                className="app-sidebar"
                onMouseOver={() => Onhover()}
                onMouseOut={() => Outhover()}
            >
                <div className="side-header">
                    <Link className="header-brand1" href={route("dashboard")}>
                        <img
                            src={Imagesdata("buapBlanco")}
                            className="header-brand-img desktop-logo"
                            alt="logo1"
                        />
                        <img
                            src={Imagesdata("bBlanco")}
                            className="header-brand-img toggle-logo"
                            alt="logo-2"
                        />
                        <img
                            src={Imagesdata("bBlanco")}
                            className="header-brand-img light-logo"
                            alt="logo-3"
                        />
                        <img
                            src={Imagesdata("buapBlanco")}
                            className="header-brand-img light-logo1"
                            alt="logo-4"
                        />
                    </Link>
                </div>
                <div className="main-sidemenu">
                    <div className="slide-left disabled" id="slide-left">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="#7b8191"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                        >
                            <path d="M13.293 6.293 7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z" />
                        </svg>
                    </div>
                    {/* first level */}
                    <ul className="side-menu" style={{ marginLeft: "0px" }}>
                        {menuitems
                            .filter((item) =>
                                item.rol.includes(Number(user.rol))
                            )
                            .map((Item, i) => (
                                <Fragment key={i + Math.random() * 100}>
                                    <li className="sub-category">
                                        <h3 style={{ color: "white" }}>
                                            {Item.menutitle}
                                        </h3>
                                    </li>
                                    {Item.Items.filter((item) =>
                                        item.rol.includes(Number(user.rol))
                                    ).map((menuItem: any, i) => (
                                        <li
                                            className={`slide ${
                                                menuItem.selected
                                                    ? "is-expanded"
                                                    : ""
                                            }`}
                                            key={i}
                                        >
                                            {menuItem.type === "sub" ? (
                                                <Link
                                                    href="#"
                                                    className={`side-menu__item ${
                                                        menuItem.selected
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    onClick={(event: any) => {
                                                        event.preventDefault();
                                                        toggleSidemenu(
                                                            menuItem
                                                        );
                                                    }}
                                                    style={{ color: "white" }}
                                                >
                                                    <i
                                                        className={`${menuItem.icon} side-menu__icon`}
                                                        style={{
                                                            color: "white",
                                                        }}
                                                    ></i>
                                                    <span className="side-menu__label">
                                                        {menuItem.title}
                                                        {menuItem.active}
                                                    </span>
                                                    {menuItem.badge ? (
                                                        <span
                                                            className={
                                                                menuItem.badge
                                                            }
                                                        >
                                                            {menuItem.badgetxt}
                                                        </span>
                                                    ) : (
                                                        ""
                                                    )}

                                                    {menuItem.active ? (
                                                        document.body.classList.contains(
                                                            "horizontal"
                                                        ) ? (
                                                            <i className="angle fe fe-chevron-up"></i>
                                                        ) : (
                                                            <i className="angle fe fe-chevron-down"></i>
                                                        )
                                                    ) : document.body.classList.contains(
                                                          "horizontal"
                                                      ) ? (
                                                        <i className="angle fe fe-chevron-down"></i>
                                                    ) : (
                                                        <i className="angle fe fe-chevron-right"></i>
                                                    )}
                                                </Link>
                                            ) : (
                                                ""
                                            )}

                                            {menuItem.type === "link" ? (
                                                <Link
                                                    href={getFullUrl(
                                                        menuItem.path
                                                    )}
                                                    className={`side-menu__item ${
                                                        menuItem.selected
                                                            ? " active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        toggleSidemenu(menuItem)
                                                    }
                                                    style={{ color: "white" }}
                                                >
                                                    <i
                                                        className={`${menuItem.icon} side-menu__icon`}
                                                        style={{
                                                            color: "white",
                                                        }}
                                                    ></i>
                                                    <span className="side-menu__label">
                                                        {menuItem.title}
                                                    </span>
                                                    {menuItem.badge ? (
                                                        <span
                                                            className={
                                                                menuItem.badge
                                                            }
                                                        >
                                                            {menuItem.badgetxt}
                                                        </span>
                                                    ) : (
                                                        ""
                                                    )}
                                                </Link>
                                            ) : (
                                                ""
                                            )}
                                            {/* Second Level */}
                                            {menuItem.children ? (
                                                <ul
                                                    className={`slide-menu ${
                                                        menuItem.Names
                                                    } ${
                                                        menuItem.active
                                                            ? "open"
                                                            : ""
                                                    }`}
                                                    style={
                                                        menuItem.active
                                                            ? {
                                                                  opacity: 1,
                                                                  transition:
                                                                      "opacity 500ms ease-in",
                                                                  display:
                                                                      "block",
                                                              }
                                                            : {
                                                                  display:
                                                                      "none",
                                                              }
                                                    }
                                                >
                                                    <div
                                                        className={`${menuItem.Name}`}
                                                    >
                                                        {menuItem.children
                                                            .filter(
                                                                (item: any) =>
                                                                    item.rol.includes(
                                                                        Number(
                                                                            user.rol
                                                                        )
                                                                    )
                                                            )
                                                            .map(
                                                                (
                                                                    childrenItem: any,
                                                                    index: any
                                                                ) => {
                                                                    return (
                                                                        <li
                                                                            key={
                                                                                index
                                                                            }
                                                                            className={`sub-slide ${
                                                                                childrenItem.active
                                                                                    ? "is-expanded"
                                                                                    : ""
                                                                            }`}
                                                                        >
                                                                            {childrenItem.type ===
                                                                            "sub" ? (
                                                                                <Link
                                                                                    href="#"
                                                                                    className={`sub-side-menu__item ${
                                                                                        childrenItem.selected
                                                                                            ? "active"
                                                                                            : ""
                                                                                    }`}
                                                                                    onClick={(
                                                                                        event: any
                                                                                    ) => {
                                                                                        event.preventDefault();
                                                                                        toggleSidemenu(
                                                                                            childrenItem
                                                                                        );
                                                                                    }}
                                                                                    style={{
                                                                                        color: "white",
                                                                                    }}
                                                                                >
                                                                                    <span className="sub-side-menu__label">
                                                                                        {
                                                                                            childrenItem.title
                                                                                        }
                                                                                        {
                                                                                            childrenItem.active
                                                                                        }
                                                                                    </span>
                                                                                    {childrenItem.active ? (
                                                                                        <i className="sub-angle fa fa-angle-down"></i>
                                                                                    ) : (
                                                                                        <i className="sub-angle fa fa-angle-right"></i>
                                                                                    )}
                                                                                </Link>
                                                                            ) : (
                                                                                ""
                                                                            )}

                                                                            {childrenItem.type ===
                                                                            "link" ? (
                                                                                <Link
                                                                                    href={getFullUrl(
                                                                                        childrenItem.path
                                                                                    )}
                                                                                    className="slide-item"
                                                                                    style={{
                                                                                        color: "white",
                                                                                    }}
                                                                                >
                                                                                    {
                                                                                        childrenItem.title
                                                                                    }
                                                                                </Link>
                                                                            ) : (
                                                                                ""
                                                                            )}
                                                                            {/* third lavel */}
                                                                            {childrenItem.children ? (
                                                                                <ul
                                                                                    className="sub-slide-menu"
                                                                                    style={
                                                                                        childrenItem.active
                                                                                            ? {
                                                                                                  display:
                                                                                                      "block",
                                                                                              }
                                                                                            : {
                                                                                                  display:
                                                                                                      "none",
                                                                                              }
                                                                                    }
                                                                                >
                                                                                    {childrenItem.children
                                                                                        .filter(
                                                                                            (
                                                                                                item: any
                                                                                            ) =>
                                                                                                item.rol.includes(
                                                                                                    Number(
                                                                                                        user.rol
                                                                                                    )
                                                                                                )
                                                                                        )
                                                                                        .map(
                                                                                            (
                                                                                                childrenSubItem: any,
                                                                                                key: any
                                                                                            ) => (
                                                                                                <li
                                                                                                    className={`${
                                                                                                        childrenSubItem.selected
                                                                                                            ? " is-expanded"
                                                                                                            : ""
                                                                                                    }`}
                                                                                                    key={
                                                                                                        key
                                                                                                    }
                                                                                                >
                                                                                                    {childrenSubItem.type ===
                                                                                                    "link" ? (
                                                                                                        <Link
                                                                                                            href={getFullUrl(
                                                                                                                childrenSubItem.path
                                                                                                            )}
                                                                                                            className="sub-slide-item"
                                                                                                            style={{
                                                                                                                color: "white",
                                                                                                            }}
                                                                                                        >
                                                                                                            {
                                                                                                                childrenSubItem.title
                                                                                                            }
                                                                                                        </Link>
                                                                                                    ) : (
                                                                                                        ""
                                                                                                    )}

                                                                                                    {childrenSubItem.type ===
                                                                                                    "sub" ? (
                                                                                                        <Link
                                                                                                            href="#"
                                                                                                            className={`"sub-slide-item" ${
                                                                                                                childrenSubItem.selected
                                                                                                                    ? " is-expanded"
                                                                                                                    : ""
                                                                                                            }`}
                                                                                                            onClick={(
                                                                                                                event: any
                                                                                                            ) => {
                                                                                                                event.preventDefault();
                                                                                                                toggleSidemenu(
                                                                                                                    childrenSubItem
                                                                                                                );
                                                                                                            }}
                                                                                                            style={{
                                                                                                                color: "white",
                                                                                                            }}
                                                                                                        >
                                                                                                            <span className="sub-side-menu__label">
                                                                                                                {
                                                                                                                    childrenSubItem.title
                                                                                                                }
                                                                                                            </span>
                                                                                                            {childrenSubItem.active ? (
                                                                                                                <i className="sub-angle fa fa-angle-down"></i>
                                                                                                            ) : (
                                                                                                                <i className="sub-angle fa fa-angle-right"></i>
                                                                                                            )}
                                                                                                        </Link>
                                                                                                    ) : (
                                                                                                        ""
                                                                                                    )}
                                                                                                </li>
                                                                                            )
                                                                                        )}
                                                                                </ul>
                                                                            ) : (
                                                                                ""
                                                                            )}
                                                                        </li>
                                                                    );
                                                                }
                                                            )}
                                                    </div>
                                                </ul>
                                            ) : (
                                                ""
                                            )}
                                        </li>
                                    ))}
                                </Fragment>
                            ))}
                    </ul>
                    <div className="slide-right" id="slide-right">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="#7b8191"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                        >
                            <path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z" />
                        </svg>
                    </div>
                </div>
                {/* </PerfectScrollbar> */}
            </div>
        </Fragment>
    );
};
