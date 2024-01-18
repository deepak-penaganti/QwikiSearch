import { NavLink, Outlet } from "react-router-dom";

import Logo from "./Logo.svg";

import Styles from "./Root.module.scss";

export default function Root() {
    return <>
        <header>
            <NavLink to="/">
                <img id={Styles.Logo} src={Logo} alt="Qwiki Search Logo" />
            </NavLink>
            <nav>
                <NavLink className={({ isActive }) => isActive ? Styles.active : ""} to="/">
                    Search By Title
                </NavLink>
                <NavLink className={({ isActive }) => isActive ? Styles.active : ""} to="/advanced">
                    Search By Content
                </NavLink>
            </nav>
        </header>
        <Outlet />
    </>
}