import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  ShieldCheck,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { ErrorMessage } from "../components/Live";

type Step =
  "signIn" | "signUp" | "reset" | "reset-verification" | "email-verification";

export function SignIn() {
  const { signIn } = useAuthActions();
  const providers = useQuery(api.authOptions.available);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("signIn");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsCode =
    step === "email-verification" || step === "reset-verification";
  const needsPassword =
    step === "signIn" || step === "signUp" || step === "reset-verification";
  const newPassword = step === "signUp" || step === "reset-verification";
  function changeStep(next: Step) {
    setStep(next);
    setError("");
    setPassword("");
    setConfirm("");
    setCode("");
    setShowPassword(false);
  }
  async function social(provider: "google" | "facebook") {
    setBusy(true);
    setError("");
    try {
      await signIn(provider, { redirectTo: "/members" });
    } catch {
      setError(
        "We could not connect to that provider. Please try again or use your password.",
      );
      setBusy(false);
    }
  }
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
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (newPassword && password !== confirm) {
            setError("Your passwords do not match.");
            return;
          }
          setBusy(true);
          const normalized = email.trim().toLowerCase();
          setEmail(normalized);
          try {
            const result = await signIn("password", {
              email: normalized,
              flow: step,
              ...(needsCode ? { code } : {}),
              ...(needsPassword
                ? step === "reset-verification"
                  ? { newPassword: password }
                  : { password }
                : {}),
            });
            if (step === "reset") changeStep("reset-verification");
            else if (
              (step === "signUp" || step === "signIn") &&
              !result.signingIn
            )
              changeStep("email-verification");
            else {
              setPassword("");
              setConfirm("");
              setCode("");
            }
          } catch {
            // Avoid revealing whether an address belongs to a member.
            if (step === "reset") changeStep("reset-verification");
            else
              setError(
                needsCode
                  ? "That code could not be verified. Check it or request a new code."
                  : step === "signUp"
                    ? "We could not create this password. If you already have one, sign in or reset it. Otherwise, try again later."
                    : "We could not sign you in. Check your email and password. If you used email codes before, choose Create or set a password.",
              );
          } finally {
            setBusy(false);
          }
        }}
      >
        <LockKeyhole className="auth-icon" size={26} />
        <h2>
          {step === "signIn"
            ? "Welcome to Arbahara"
            : step === "signUp"
              ? "Create or set a password"
              : step === "reset"
                ? "Reset your password"
                : step === "reset-verification"
                  ? "Choose a new password"
                  : "Verify your email once"}
        </h2>
        <p>
          {step === "signIn"
            ? "Sign in with your password or a connected account."
            : step === "signUp"
              ? "Use your existing member email to keep your membership, gifts, and tickets together. We will verify your email once before you sign in."
              : step === "reset"
                ? "Enter your account email. If a password account exists, we will send a reset code."
                : step === "reset-verification"
                  ? "Enter the reset code from your email and choose a new password. If no email arrives, check spam or create a password if you previously used email codes."
                  : "Enter the 8-digit code from your email. After this one-time check, use your password to sign in."}
        </p>
        {step === "signIn" && (providers?.google || providers?.facebook) ? (
          <>
            <div className="social-signin">
              {providers.google ? (
                <button
                  className="button secondary full"
                  type="button"
                  disabled={busy}
                  onClick={() => void social("google")}
                >
                  <span aria-hidden="true" className="social-letter">
                    G
                  </span>{" "}
                  Continue with Google
                </button>
              ) : null}
              {providers.facebook ? (
                <button
                  className="button secondary full"
                  type="button"
                  disabled={busy}
                  onClick={() => void social("facebook")}
                >
                  <span aria-hidden="true" className="social-letter">
                    f
                  </span>{" "}
                  Continue with Facebook
                </button>
              ) : null}
            </div>
            <p className="auth-divider">or use your password</p>
          </>
        ) : null}
        <label>
          Email address
          <input
            autoComplete="username"
            name="email"
            type="email"
            maxLength={254}
            required
            readOnly={needsCode}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {needsCode ? (
          <label>
            Verification code
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
            <span className="small">Codes expire after 15 minutes.</span>
          </label>
        ) : null}
        {needsPassword ? (
          <>
            <label>
              <span id="member-password-label">
                {newPassword ? "New password" : "Password"}
              </span>
              <span className="password-field">
                <input
                  autoComplete={
                    newPassword ? "new-password" : "current-password"
                  }
                  name="password"
                  aria-labelledby="member-password-label"
                  type={showPassword ? "text" : "password"}
                  minLength={newPassword ? 12 : undefined}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
              {newPassword ? (
                <span className="small">
                  Use 12–128 characters. A longer, unique passphrase works well.
                </span>
              ) : null}
            </label>
            {newPassword ? (
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            ) : null}
          </>
        ) : null}
        <ErrorMessage message={error} />
        <button className="button full" disabled={busy}>
          {busy
            ? "Please wait…"
            : step === "signIn"
              ? "Sign in"
              : step === "signUp"
                ? "Create password"
                : step === "reset"
                  ? "Send reset code"
                  : step === "reset-verification"
                    ? "Save password and sign in"
                    : "Verify and sign in"}
          <ArrowRight size={17} />
        </button>
        <div className="auth-links">
          {step === "signIn" ? (
            <>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => changeStep("reset")}
              >
                Forgot password?
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => changeStep("signUp")}
              >
                Create or set a password
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => changeStep("signIn")}
            >
              Back to sign in
            </button>
          )}
          {needsCode ? (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await signIn("password", {
                    email,
                    flow:
                      step === "reset-verification"
                        ? "reset"
                        : "email-verification",
                  });
                } catch {
                  setError(
                    "We could not send another code. Wait a few minutes, then try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Request a new code
            </button>
          ) : null}
        </div>
        <p className="small">
          <ShieldCheck size={15} /> Keep your password private. The monastery
          office will never ask for it.
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
