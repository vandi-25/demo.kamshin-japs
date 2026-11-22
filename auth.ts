import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { mergeCartItems } from "@/lib/cart/rules";
import { mergeGuestCartIntoUser } from "@/lib/cart/store";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { verifyPassword } from "@/lib/password";
import { clientIp, firstExceeded, rateLimit } from "@/lib/rate-limit";
import type { RateRuleName } from "@/lib/rate-limit-core";

export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

// Email/password login with JWT sessions (no session collection).
// trustHost because store and admin live on different hostnames. Cookies are host-only,
// so the two logins stay separate. The role in the token is only for display -
// requireAdmin() checks the DB.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, scope: {} },
      // rate limit here rather than in the actions so /api/auth/callback is covered too
      authorize: async (credentials, request) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase().slice(0, 254) : "";
        const ip = clientIp(request.headers);
        const rules: [RateRuleName, string][] = [
          ["loginPerIp", ip],
          ["loginPerAccountAndIp", `${email}|${ip}`],
          ["loginPerAccount", email],
        ];
        if (await firstExceeded(rateLimit, rules)) throw new TooManyAttempts();

        const user = await authorizeCredentials(credentials, {
          verifyPassword,
          findUserByEmail: async (lookupEmail) => {
            await connectDB();
            const found = await User.findOne({ email: lookupEmail }).select("+passwordHash");
            if (!found) return null;
            return {
              id: found.id as string,
              name: found.name,
              email: found.email,
              role: found.role,
              passwordHash: found.passwordHash,
            };
          },
        });
        // only count failures
        if (!user) await Promise.all(rules.map(([rule, key]) => rateLimit.hit(rule, key)));
        return user;
      },
    }),
  ],
  events: {
    // runs inside the sign-in action, so we can still read/clear the cartId cookie
    async signIn({ user }) {
      if (!user.id) return;
      try {
        await mergeGuestCartIntoUser(user.id, mergeCartItems);
      } catch (error) {
        // don't fail the login over this
        console.error("Cart merge on sign-in failed", error);
      }
    },
  },
  callbacks: {
    jwt({ token, user }) {
      // user is only set right after sign in
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
