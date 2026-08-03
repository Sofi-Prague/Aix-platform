"use client";

import { Button } from "../../components/ui/Button";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IndexWorkspaceShell } from "../../components/IndexWorkspaceShell";
import {
  getCurrentUser,
  getIndexes,
  IndexRecord,
  User,
} from "../../lib/api";
import {
  getAccessToken,
  removeAccessToken,
} from "../../lib/auth";
import { IndexManager } from "../../components/IndexManager";

export default function WorkspacePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [indexes, setIndexes] = useState<IndexRecord[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspace(): Promise<void> {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const [currentUser, tenantIndexes] =
          await Promise.all([
            getCurrentUser(),
            getIndexes(),
          ]);

        setUser(currentUser);
        setIndexes(tenantIndexes);
      } catch (error) {
        removeAccessToken();

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load the workspace.",
        );

        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, [router]);

  function handleLogout(): void {
    removeAccessToken();
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main
        aria-live="polite"
        style={{ padding: "var(--aix-space-xl)" }}
      >
        <p>Loading workspace…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "var(--aix-space-xl)" }}>
        <p role="alert">{error}</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main>
      <header
        style={{
          minHeight: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--aix-space-md)",
          padding: "0 var(--aix-space-lg)",
          borderBottom:
            "1px solid var(--aix-color-border)",
          background: "var(--aix-color-surface)",
        }}
      >
        <div>
          <strong>AIX</strong>

          <span
            style={{
              marginLeft: "var(--aix-space-md)",
              color: "var(--aix-color-text-muted)",
            }}
          >
            {user.email} · {user.role}
          </span>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleLogout}
        >
          Sign out
        </Button>
      </header>

      <IndexManager
        indexes={indexes}
        onIndexesChange={setIndexes}
      />

      <IndexWorkspaceShell />
    </main>
  );
}