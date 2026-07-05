import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { name, email, username, password } = await req.json();

    if (!name || !email || !username || !password) {
      return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }

    const emailKey    = `user:email:${email.toLowerCase().trim()}`;
    const usernameKey = `user:username:${username.toLowerCase().trim()}`;

    // Check duplicates
    const [existingEmail, existingUsername] = await Promise.all([
      redis.get(emailKey),
      redis.get(usernameKey),
    ]);

    if (existingEmail)    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    if (existingUsername) return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const id = nanoid();

    const user = {
      id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
      passwordHash,
      role: "user",
      createdAt: Date.now(),
    };

    await Promise.all([
      redis.set(emailKey,    JSON.stringify(user)),
      redis.set(usernameKey, JSON.stringify(user)),
      redis.set(`user:id:${id}`, JSON.stringify(user)),
      redis.sadd("users", id),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
