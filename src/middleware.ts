export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/folder/:path*",
    "/deck/:path*",
    "/study/:path*",
    "/admin/:path*",
    "/api/folders/:path*",
    "/api/decks/:path*",
    "/api/cards/:path*",
    "/api/import/:path*",
    "/api/users/:path*",
  ],
};
