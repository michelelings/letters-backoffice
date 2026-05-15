import { NavLink } from "react-router-dom";

export function TopNav() {
  return (
    <nav className="bo-topnav" aria-label="Sections">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          isActive ? "bo-topnav__link bo-topnav__link--active" : "bo-topnav__link"
        }
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/coverage"
        className={({ isActive }) =>
          isActive ? "bo-topnav__link bo-topnav__link--active" : "bo-topnav__link"
        }
      >
        Coverage
      </NavLink>
    </nav>
  );
}
