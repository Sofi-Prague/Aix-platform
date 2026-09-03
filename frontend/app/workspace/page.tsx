"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IndexManager } from "../../components/IndexManager";
import { IndexWorkspaceShell } from "../../components/IndexWorkspaceShell";
import { Button } from "../../components/ui/Button";

import { AppShell } from "../../components/AppShell";

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

  const [user, setUser] =
    useState<User | null>(null);

  const [indexes, setIndexes] =
    useState<IndexRecord[]>([]);

  const [
    selectedIndex,
    setSelectedIndex,
  ] = useState<IndexRecord | null>(
    null,
  );

  const [
    selectedDimension,
    setSelectedDimension,
  ] = useState<DimensionRecord | null>(
    null,
  );

  const [
    selectedIndicator,
    setSelectedIndicator,
  ] = useState<IndicatorRecord | null>(
    null,
  );

  /*
   * Incrementing this value tells components
   * that methodology data has changed.
   *
   * This is used by:
   * - DimensionManager
   * - IndicatorManager
   * - PublishPanel
   * - AI Co-Pilot
   */
  const [
    methodologyVersion,
    setMethodologyVersion,
  ] = useState(0);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    async function loadWorkspace(): Promise<void> {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const [
          currentUser,
          tenantIndexes,
        ] = await Promise.all([
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

  async function refreshMethodology(): Promise<void> {
  setMethodologyVersion(
    (current) => current + 1,
  );

  try {
    const updatedIndexes =
      await getIndexes();

    setIndexes(updatedIndexes);

    if (selectedIndex) {
      const updatedSelectedIndex =
        updatedIndexes.find(
          (index) =>
            index.id === selectedIndex.id,
        ) ?? null;

      setSelectedIndex(
        updatedSelectedIndex,
      );
    }
  } catch (caughtError) {
    setError(
      caughtError instanceof Error
        ? caughtError.message
        : "Unable to refresh the index state.",
    );
  }
}

  function handleLogout(): void {
    removeAccessToken();
    router.replace("/login");
  }

  function handleSelectIndex(
    index: IndexRecord | null,
  ): void {
    setSelectedIndex(index);

    /*
     * A dimension or indicator belongs to the
     * previously selected index, so clear both
     * whenever the selected index changes.
     */
    setSelectedDimension(null);
    setSelectedIndicator(null);
  }

  function handleSelectDimension(
    dimension: DimensionRecord | null,
  ): void {
    setSelectedDimension(dimension);

    /*
     * Indicators belong to dimensions.
     * Clear the old indicator whenever the
     * selected dimension changes.
     */
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
        (index) =>
          index.id === selectedIndex.id,
      ) ?? null;

    setSelectedIndex(
      updatedSelectedIndex,
    );

    /*
     * If the currently selected index was
     * deleted, clear the methodology selection.
     */
    if (!updatedSelectedIndex) {
      setSelectedDimension(null);
      setSelectedIndicator(null);
    }
  }

  async function handleIndexPublished(): Promise<void> {
    try {
      /*
       * Reload indexes so the workspace gets the
       * new published status from the backend.
       */
      const updatedIndexes =
        await getIndexes();

      setIndexes(updatedIndexes);

      if (selectedIndex) {
        const updatedSelectedIndex =
          updatedIndexes.find(
            (index) =>
              index.id ===
              selectedIndex.id,
          ) ?? null;

        setSelectedIndex(
          updatedSelectedIndex,
        );
      }

      /*
       * Publishing can affect anything displaying
       * the current methodology/index state.
       */
      refreshMethodology();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to refresh the index after publishing.",
      );
    }
  }

  if (isLoading) {
    return (
      <main
        aria-live="polite"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding:
            "var(--aix-space-xl)",
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
          padding:
            "var(--aix-space-xl)",
        }}
      >
        <p role="alert">
          {error}
        </p>

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.replace("/login")
          }
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
  <AppShell
    userEmail={user.email}
    userRole={user.role}
    onLogout={handleLogout}
  >
    <div className="aix-page">
      <div className="aix-page-header">
        <div>
          <p className="aix-section-label">
            Research workspace
          </p>

          <h1 className="aix-page-title">
            AIX Dashboard
          </h1>

          <p className="aix-page-subtitle">
            Build, validate and publish
            evidence-based indices.
          </p>
        </div>
      </div>

      <IndexManager
      indexes={indexes}
      selectedIndex={selectedIndex}
      onIndexesChange={
        handleIndexesChange
      }
      onSelectIndex={
        handleSelectIndex
      }
      onMethodologyChange={() =>
        void refreshMethodology()
      }
    />

      <IndexWorkspaceShell
        selectedIndex={
          selectedIndex
        }
        selectedDimension={
          selectedDimension
        }
        selectedIndicator={
          selectedIndicator
        }
        methodologyVersion={
          methodologyVersion
        }
        onSelectDimension={
          handleSelectDimension
        }
        onSelectIndicator={
          setSelectedIndicator
        }
        onMethodologyChange={() =>
          void refreshMethodology()
        }
        onIndexPublished={() =>
          void handleIndexPublished()
        }
      />
    </div>
  </AppShell>
);
}