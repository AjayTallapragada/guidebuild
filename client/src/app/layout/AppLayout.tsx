import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AppLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">ParcelShield AI</Link>
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/policies">Policies</NavLink>
          <NavLink to="/premium">Premium</NavLink>
          <NavLink to="/claims">Claims</NavLink>
          <NavLink to="/payouts">Payouts</NavLink>
        </nav>
        <div className="account-box">
          <span>{user?.fullName}</span>
          <button onClick={() => logout()}>Log out</button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
