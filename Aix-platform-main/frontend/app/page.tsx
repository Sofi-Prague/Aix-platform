import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        padding: "var(--aix-space-xl)",
      }}
    >
      <h1>AIX</h1>

      <p
        style={{
          color: "var(--aix-color-text-muted)",
        }}
      >
        AI-assisted index development and publishing.
      </p>

      <Link href="/login">Sign in to the workspace</Link>
    </main>
  );
}