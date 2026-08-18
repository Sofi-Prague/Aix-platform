"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

import { register } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

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

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters long.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
      });

      router.push(
        `/login?registered=true&email=${encodeURIComponent(
          email,
        )}`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create account.",
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
        background:
          "var(--aix-color-background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <Card title="Create an AIX account">
          <p
            style={{
              color:
                "var(--aix-color-text-muted)",
              marginTop: 0,
              marginBottom:
                "var(--aix-space-lg)",
            }}
          >
            Create an account to start building
            and managing indexes in AIX.
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
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />

            <Input
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />

            <Input
              id="confirm-password"
              name="confirm-password"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
            />

            {error && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color:
                    "var(--aix-color-danger)",
                }}
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              Create account
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                router.push("/login")
              }
            >
              Back to sign in
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}