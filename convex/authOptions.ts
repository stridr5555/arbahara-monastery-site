import { query } from "./_generated/server";

// Expose availability only. Provider secrets stay on the server.
export const available = query({
  args: {},
  handler: () => ({
    google:
      process.env.AUTH_GOOGLE_ENABLED === "true" &&
      Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    facebook:
      process.env.AUTH_FACEBOOK_ENABLED === "true" &&
      Boolean(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
  }),
});
