import { getAdminAuth } from "@/lib/firebase/admin";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        try {
          const decoded = await getAdminAuth().verifyIdToken(credentials.idToken);
          const isAdmin =
            (decoded as any)?.isAdmin === true ||
            (decoded as any)?.claims?.isAdmin === true ||
            (decoded as any)?.["https://hasura.io/jwt/claims"]?.["x-hasura-default-role"] === "admin";
          if (!isAdmin) {
            throw new Error("NotAdmin");
          }
          return {
            id: decoded.uid,
            email: decoded.email ?? undefined,
            name: decoded.name ?? decoded.email ?? "Firebase user",
            image: decoded.picture ?? undefined,
            isAdmin: true,
          };
        } catch (error) {
          const msg = (error as Error)?.message;
          if (msg === "NotAdmin") {
            throw error;
          }
          console.error("Failed to verify Firebase ID token", error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    if (new URL(url).origin === baseUrl) return url;
    return baseUrl;
  },

    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = (user as any).isAdmin === true;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).isAdmin = token.isAdmin === true;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
