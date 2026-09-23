import { useEffect, useState, type ReactNode } from "react";
export function Live({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready && import.meta.env.VITE_CONVEX_URL ? (
    <>{children}</>
  ) : (
    <>{fallback}</>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="form-message error" role="alert">
      {message}
    </p>
  ) : null;
}
export function message(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return (
    text
      .replace(/\[CONVEX[^\]]*\]\s*/g, "")
      .replace(/\[Request ID[^\]]*\]\s*/g, "")
      .replace(/Server Error\s*/g, "")
      .replace(/Uncaught (?:Error|ConvexError):\s*/g, "")
      .split("\n")[0] || "Something went wrong. Please try again."
  );
}
export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
