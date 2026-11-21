import type { UserRole } from '@prisma/client';
import type { NextAuthConfig } from 'next-auth';

const authConfig = {
  secret: process.env.AUTH_SECRET || 'ironpulse-local-dev-secret-key-at-least-32-chars',
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
