import { Link, Outlet } from '@tanstack/react-router';
import styles from './Shell.module.css';

export function Shell() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>AdCut</span>
        <nav aria-label="Main" className={styles.nav}>
          <Link to="/" activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/foundation/check">Foundation</Link>
        </nav>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
