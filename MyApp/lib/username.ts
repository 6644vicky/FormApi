// Top-level app/ route names a username would collide with, plus a few
// generic words worth blocking outright. Next.js always resolves static
// routes (app/signup, app/api, ...) before a dynamic app/[username] segment,
// so a colliding username wouldn't actually break routing — but a user named
// "signup" or "api" would be unreachable at their own vanity URL, so these
// are rejected at creation time instead.
export const RESERVED_USERNAMES = [
  "actions", "api", "book", "builder", "calendar-builder", "chatbot-builder",
  "check-inbox", "components", "form", "forgot-password", "inbox",
  "password-changed", "reset-password", "signup", "verify-email",
  "www", "admin", "settings", "help", "static", "favicon",
];

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export function validateUsernameFormat(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Usernames must be 3-30 characters: lowercase letters, numbers, and hyphens only.";
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return "This username is reserved.";
  }
  return null;
}
