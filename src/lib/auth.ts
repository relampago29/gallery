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
          return {
            id: decoded.uid,
            email: decoded.email ?? undefined,
            name: decoded.name ?? decoded.email ?? "Firebase user",
            image: decoded.picture ?? undefined,
          };
        } catch (error) {
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

    async session({ session }) {
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
