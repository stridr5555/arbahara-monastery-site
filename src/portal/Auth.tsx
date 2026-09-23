import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { ErrorMessage, message } from "../components/Live";
export function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="auth-layout">
      <div className="auth-copy">
        <span className="section-label">A place in the community</span>
        <h2>
          Your membership.
          <br />
          Your giving.
          <br />
          Our shared life.
        </h2>
        <p>
          Sign in to apply for membership, keep your giving records together,
          and reserve tickets for published gatherings.
        </p>
        <p>
          You do not need to make a donation to become part of the community.
        </p>
        <a className="text-link" href="/visit">
          Need help? Contact the office <ArrowRight size={16} />
        </a>
      </div>
      <form
        className="auth-form panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const normalized = email.trim().toLowerCase();
            setEmail(normalized);
            await signIn(
              "email",
              step === "code"
                ? { email: normalized, code }
                : { email: normalized },
            );
            if (step === "email") setStep("code");
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Mail className="auth-icon" size={26} />
        <h2>{step === "email" ? "Welcome to Arbahara" : "Check your email"}</h2>
        <p>
          {step === "email"
            ? "We’ll send you a one-time sign-in code. New and returning members use the same secure sign-in."
            : `Enter the 8-digit code sent to ${email}. It expires in 15 minutes.`}
        </p>
        {step === "email" ? (
          <label>
            Email address
            <input
              autoComplete="email"
              name="email"
              type="email"
              maxLength={254}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        ) : (
          <label>
            Sign-in code
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        )}
        <ErrorMessage message={error} />
        <button className="button full" disabled={busy}>
          {busy
            ? "Please wait…"
            : step === "email"
              ? "Send my sign-in code"
              : "Verify and sign in"}
          <ArrowRight size={17} />
        </button>
        {step === "code" ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            Use another email or request a new code
          </button>
        ) : null}
        <p className="small">
          <ShieldCheck size={15} /> Keep your sign-in code private. No password
          is needed.
        </p>
        <p className="small">
          By continuing, you acknowledge our{" "}
          <a href="/privacy">privacy notice</a> and{" "}
          <a href="/terms">website terms</a>.
        </p>
      </form>
    </div>
  );
}
