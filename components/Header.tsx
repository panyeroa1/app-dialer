/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI } from '@/lib/state';

export default function Header() {
  const { toggleSidebar } = useUI();

  return (
    <header>
      <div className="header-left">
        <h1>Eburon Mobile</h1>
      </div>
      <div className="header-right">
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Settings"
        >
          <span className="material-symbols-outlined">tune</span>
        </button>
      </div>
      <style>{`
        .settings-button {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .settings-button:active {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </header>
  );
}