import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const payload = {
          email: user.email,
          name: user.name,
          avatar: user.image,
          googleId: user.id
        };
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
           const data = await res.json();
           user.id = data.user.id;
           return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.avatar = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = (token as any).avatar;
      }
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name: 'user_token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  jwt: {
    encode: async ({ secret, token }) => {
      return jwt.sign(token!, secret as string, { expiresIn: '7d' });
    },
    decode: async ({ secret, token }) => {
      if (!token) return null;
      try {
        return jwt.verify(token, secret as string) as any;
      } catch (e) {
        return null;
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'secret123',
});

export { handler as GET, handler as POST };
