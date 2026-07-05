import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  role?: "admin" | "user";
  createdAt?: number;
}

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "admin" | "user";
  createdAt: number | null;
}

function parseUser(value: unknown): StoredUser | null {
  if (!value) return null;
  if (typeof value === "string") return JSON.parse(value) as StoredUser;
  return value as StoredUser;
}

export function toAdminUserView(user: StoredUser): AdminUserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role === "admin" ? "admin" : "user",
    createdAt: user.createdAt ?? null,
  };
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  return parseUser(await redis.get(`user:id:${id}`));
}

export async function listUsers(): Promise<AdminUserView[]> {
  const ids = await redis.smembers("users") as string[];
  const users = await Promise.all(ids.map((id) => getUserById(id)));

  return users
    .filter((user): user is StoredUser => Boolean(user))
    .map(toAdminUserView)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
}

export async function deleteUserById(id: string) {
  const user = await getUserById(id);
  if (!user) return false;

  await Promise.all([
    redis.del(`user:id:${user.id}`),
    redis.del(`user:email:${user.email.toLowerCase().trim()}`),
    redis.del(`user:username:${user.username.toLowerCase().trim()}`),
    redis.srem("users", user.id),
  ]);

  return true;
}
