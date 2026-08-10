"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IndexManager } from "../../components/IndexManager";
import { IndexWorkspaceShell } from "../../components/IndexWorkspaceShell";
import { Button } from "../../components/ui/Button";

import {
  getCurrentUser,
  getIndexes,
  type DimensionRecord,
  type IndicatorRecord,
  type IndexRecord,
  type User,
} from "../../lib/api";

import {
  getAccessToken,
  removeAccessToken,
} from "../../lib/auth";



export default function WorkspacePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [indexes, setIndexes] = useState<IndexRecord[]>([]);

  const [selectedIndex, setSelectedIndex] =
    useState<IndexRecord | null>(null);

  const [selectedDimension, setSelectedDimension] =
    useState<DimensionRecord | null>(null);

  const [selectedIndicator, setSelectedIndicator] =
    useState<IndicatorRecord | null>(null);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [methodologyVersion, setMethodologyVersion] =
  useState(0);

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
      } catch (caughtError) {
        removeAccessToken();

        setError(
          caughtError instanceof Error
            ? caughtError.message
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
    router.replace("/login");
  }

  function handleSelectIndex(
    index: IndexRecord | null,
  ): void {
    setSelectedIndex(index);
    setSelectedDimension(null);
    setSelectedIndicator(null);
  }

  function handleSelectDimension(
    dimension: DimensionRecord | null,
  ): void {
    setSelectedDimension(dimension);
    setSelectedIndicator(null);
  }

  function handleIndexesChange(
    updatedIndexes: IndexRecord[],
  ): void {
    setIndexes(updatedIndexes);

    if (!selectedIndex) {
      return;
    }

    const updatedSelectedIndex =
      updatedIndexes.find(
        (index) => index.id === selectedIndex.id,
      ) ?? null;

    setSelectedIndex(updatedSelectedIndex);

    if (!updatedSelectedIndex) {
      setSelectedDimension(null);
      setSelectedIndicator(null);
    }
  }

  function refreshMethodology(): void {
    setMethodologyVersion(
      (current) => current + 1,
    );
  }

  if (isLoading) {
    return (
      <main
        aria-live="polite"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "var(--aix-space-xl)",
        }}
      >
        <p>Loading workspace…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          padding: "var(--aix-space-xl)",
        }}
      >
        <p role="alert">{error}</p>

        <Button
          type="button"
          variant="secondary"
          onClick={() => router.replace("/login")}
        >
          Return to login
        </Button>
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
          flexWrap: "wrap",
          gap: "var(--aix-space-md)",
          padding: "var(--aix-space-md) var(--aix-space-lg)",
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
        selectedIndex={selectedIndex}
        onIndexesChange={handleIndexesChange}
        onSelectIndex={handleSelectIndex}
      />

      <IndexWorkspaceShell
        selectedIndex={selectedIndex}
        selectedDimension={selectedDimension}
        selectedIndicator={selectedIndicator}
        methodologyVersion={methodologyVersion}
        onSelectDimension={handleSelectDimension}
        onSelectIndicator={setSelectedIndicator}
        onMethodologyChange={refreshMethodology}
      />
    </main>
  );
}