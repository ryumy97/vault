import "server-only";

export function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    return { username, password };
  }
  if (process.env.NODE_ENV === "development") {
    return { username: "Admin", password: "Password" };
  }
  throw new Error(
    "Set ADMIN_USERNAME and ADMIN_PASSWORD for admin sign-in in production.",
  );
}
