"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type AppShellProps = {
  userEmail: string;
  userRole: string;
  onLogout: () => void;
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  icon: ReactNode;
  href?: string;
  disabled?: boolean;
};

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IndexesIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
      <circle cx="7" cy="6" r="1" />
      <circle cx="7" cy="12" r="1" />
      <circle cx="7" cy="18" r="1" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </svg>
  );
}

export function AppShell({
  userEmail,
  userRole,
  onLogout,
  children,
}: AppShellProps) {
  const [isCollapsed, setIsCollapsed] =
    useState(false);

  const navigation: NavigationItem[] = [
    {
      label: "Dashboard",
      href: "/workspace",
      icon: <DashboardIcon />,
    },
    {
      label: "My Indexes",
      href: "/workspace#indexes",
      icon: <IndexesIcon />,
    },
  ];

  return (
    <div
      className="aix-app-shell"
      data-sidebar-collapsed={isCollapsed}
    >
      <aside
        className="aix-sidebar"
        aria-label="AIX navigation"
      >
        <div className="aix-sidebar-brand">
          <div className="aix-brand-mark">
            AiX
          </div>

          {!isCollapsed && (
            <div className="aix-brand-copy">
              <strong>
                Academic Index
                Intelligence
              </strong>

              <span>
                Research platform
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="aix-sidebar-collapse"
          aria-label={
            isCollapsed
              ? "Expand navigation"
              : "Collapse navigation"
          }
          aria-expanded={!isCollapsed}
          onClick={() =>
            setIsCollapsed(
              (current) => !current,
            )
          }
        >
          {isCollapsed ? "›" : "‹"}
        </button>

        <nav className="aix-sidebar-nav">
          <p className="aix-sidebar-label">
            {!isCollapsed
              ? "Workspace"
              : "•••"}
          </p>

          {navigation.map((item) =>
            item.disabled ? (
              <span
                key={item.label}
                className="aix-sidebar-link"
                data-disabled="true"
                title={
                  isCollapsed
                    ? item.label
                    : undefined
                }
              >
                <span className="aix-sidebar-icon">
                  {item.icon}
                </span>

                {!isCollapsed && (
                  <>
                    <span>
                      {item.label}
                    </span>

                    <span className="aix-sidebar-soon">
                      Later
                    </span>
                  </>
                )}
              </span>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="aix-sidebar-link"
                data-active={
                  item.label ===
                  "Dashboard"
                }
                title={
                  isCollapsed
                    ? item.label
                    : undefined
                }
              >
                <span className="aix-sidebar-icon">
                  {item.icon}
                </span>

                {!isCollapsed && (
                  <span>
                    {item.label}
                  </span>
                )}
              </a>
            ),
          )}
        </nav>

        <div className="aix-sidebar-spacer" />

        <div className="aix-sidebar-organization">
          {!isCollapsed && (
            <>
              <span>
                Your organization
              </span>

              <strong>
                Anglo-American University
              </strong>
            </>
          )}

          {isCollapsed && (
            <span
              className="aix-sidebar-org-mark"
              title="Anglo-American University"
            >
              AAU
            </span>
          )}
        </div>

        <div className="aix-sidebar-user">
          <div className="aix-sidebar-user-icon">
            <UserIcon />
          </div>

          {!isCollapsed && (
            <div className="aix-sidebar-user-details">
              <strong>
                {userEmail}
              </strong>

              <span>
                {userRole}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="aix-sidebar-logout"
          onClick={onLogout}
          title={
            isCollapsed
              ? "Sign out"
              : undefined
          }
        >
          <LogoutIcon />

          {!isCollapsed && (
            <span>Sign out</span>
          )}
        </button>

        {!isCollapsed && (
          <div className="aix-sidebar-footer">
            AIX v1 · 2026
          </div>
        )}
      </aside>

      <main className="aix-app-content">
        {children}
      </main>
    </div>
  );
}