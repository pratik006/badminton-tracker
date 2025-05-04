import React, { useState } from "react";
import styles from "./Header.module.css";

function Header({ onLeaderboardClick, onMatchHistoryClick, onSignOutClick }: { onLeaderboardClick: () => void; onMatchHistoryClick: () => void; onSignOutClick: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Function to toggle the menu
  const showMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header>
      <div className={styles.header_wrapper}>
        <header>Badminton Tracker</header>
        
        {/* Hamburger Menu */}
        <div className={styles.hamburger_menu} onClick={showMenu}>
          <div className={styles.hamburger_menu_div} ></div>
          <div className={styles.hamburger_menu_div} ></div>
          <div className={styles.hamburger_menu_div} ></div>
        </div>
        
        {/* Navigation Links (Desktop) */}
        <ul className={`${styles.nav_links}`}>
          <li className={`${styles.nav_links_li}`}><a className={`${styles.nav_links_a}`} href="#">Item 1</a></li>
          <li className={`${styles.nav_links_li}`}><a className={`${styles.nav_links_a}`} href="#">Item 2</a></li>
        </ul>

        {/* Mobile Menu (only visible when 'active' class is added) */}
        <div className={`${styles.mobile_menu} ${isMenuOpen ? styles.mobile_menu_active : ""}`}>
          <button className={`${styles.nav_links_button}`} onClick={() => {onLeaderboardClick(); setIsMenuOpen(!isMenuOpen);}} >Leaderboard</button>
          <button className={`${styles.nav_links_button}`} onClick={() => {onMatchHistoryClick(); setIsMenuOpen(!isMenuOpen);}} >Match history</button>
          <button className={`${styles.nav_links_button}`} onClick={() => {onSignOutClick(); setIsMenuOpen(!isMenuOpen);}} >Sign out</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
