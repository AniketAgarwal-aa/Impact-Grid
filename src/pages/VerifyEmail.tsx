/**
 * Email verification landing — reads ?token= from query and verifies via API.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    token ? "loading" : "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Missing verification token. Use the link from your email.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await api.verifyEmail(token);
        if (!cancelled) {
          setStatus("ok");
          setMessage("Your email is verified. You can sign in now.");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setStatus("err");
          setMessage(
            e instanceof Error ? e.message : "Verification failed or token expired.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Verifying your email…</p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <h1 className="text-xl font-semibold">Verified</h1>
            <p className="text-muted-foreground">{message}</p>
            <Link
              to="/login"
              className="inline-block mt-2 text-primary font-medium hover:underline"
            >
              Go to login
            </Link>
          </>
        )}
        {status === "err" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Could not verify</h1>
            <p className="text-muted-foreground">{message}</p>
            <Link
              to="/login"
              className="inline-block mt-2 text-primary font-medium hover:underline"
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
