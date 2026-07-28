import NextAuth, { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "admin" | "user";
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string;
    username: string;
    role?: "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "admin" | "user";
  }
}

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "admin" | "user";
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string;
    username: string;
    role?: "admin" | "user";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "admin" | "user";
  }
}
