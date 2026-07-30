"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { getAccessToken, saveAccessToken } from "../../lib/auth";
import { login } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/workspace");
    }
  }, [router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await login({
        email,
        password,
      });

      saveAccessToken(response.access_token);
      router.push("/workspace");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "var(--aix-space-lg)",
        background: "var(--aix-color-background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <Card title="Sign in to AIX">
          <p
            style={{
              color: "var(--aix-color-text-muted)",
              marginTop: 0,
              marginBottom: "var(--aix-space-lg)",
            }}
          >
            Use your AIX account to access your index workspace.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: "var(--aix-space-md)",
            }}
          >
            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <Input
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />

            {error && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: "var(--aix-color-danger)",
                }}
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}