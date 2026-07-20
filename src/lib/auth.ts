import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

interface StoredUser {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  role?: "admin" | "user";
  createdAt?: number;
  lastLogin?: number;
  loginCount?: number;
}

function parseStoredUser(value: unknown): StoredUser | null {
  if (!value) return null;
  if (typeof value === "string") return JSON.parse(value) as StoredUser;
  return value as StoredUser;
}

async function recordLogin(user: StoredUser) {
  const updated: StoredUser = {
    ...user,
    lastLogin: Date.now(),
    loginCount: (user.loginCount ?? 0) + 1,
  };
  const emailKey    = `user:email:${user.email.toLowerCase().trim()}`;
  const usernameKey = `user:username:${user.username.toLowerCase().trim()}`;
  const idKey       = `user:id:${user.id}`;
  await Promise.all([
    redis.set(emailKey,    JSON.stringify(updated)),
    redis.set(usernameKey, JSON.stringify(updated)),
    redis.set(idKey,       JSON.stringify(updated)),
  ]);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "이메일 또는 아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = String(credentials.identifier).toLowerCase().trim();
        const password = String(credentials.password);

        // Try email first, then username
        let userValue: unknown = await redis.get(`user:email:${identifier}`);
        if (!userValue) {
          userValue = await redis.get(`user:username:${identifier}`);
        }

        const user = parseStoredUser(userValue);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Record login stats asynchronously (don't await - don't block login)
        recordLogin(user).catch(console.error);

        return { id: user.id, name: user.name, email: user.email, role: user.role ?? "user" };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
        session.user.role = token.role === "admin" ? "admin" : "user";
      }
      return session;
    },
  },
});
