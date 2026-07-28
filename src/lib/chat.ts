import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
}

export interface ConversationInfo {
  username: string;
  lastMessageAt: number;
}

function getRoomKey(userA: string, userB: string) {
  const [u1, u2] = [userA.toLowerCase().trim(), userB.toLowerCase().trim()].sort();
  return `chat:room:${u1}:${u2}`;
}

export async function sendMessage(sender: string, receiver: string, content: string): Promise<ChatMessage> {
  const room = getRoomKey(sender, receiver);
  const now = Date.now();
  
  const msg: ChatMessage = {
    id: randomUUID(),
    sender,
    content,
    timestamp: now,
  };

  const senderLower = sender.toLowerCase().trim();
  const receiverLower = receiver.toLowerCase().trim();

  // 1. Add message to the room list
  // 2. Update sender's recent conversations list
  // 3. Update receiver's recent conversations list
  await Promise.all([
    redis.rpush(room, JSON.stringify(msg)),
    redis.zadd(`chat:conversations:${senderLower}`, { score: now, member: receiverLower }),
    redis.zadd(`chat:conversations:${receiverLower}`, { score: now, member: senderLower }),
  ]);

  return msg;
}

export async function getMessages(userA: string, userB: string, limit: number = 50): Promise<ChatMessage[]> {
  const room = getRoomKey(userA, userB);
  // Fetch the latest `limit` messages
  // -limit to -1 gets the last N elements in the list
  const msgs = await redis.lrange(room, -limit, -1);
  return msgs.map((m) => (typeof m === 'string' ? JSON.parse(m) : m));
}

export async function getConversations(username: string): Promise<ConversationInfo[]> {
  const lower = username.toLowerCase().trim();
  // ZREVRANGE returns from highest score (newest) to lowest
  // Upstash redis zrange with 'rev' option
  const list = await redis.zrange(`chat:conversations:${lower}`, 0, -1, { rev: true, withScores: true });
  
  const convos: ConversationInfo[] = [];
  // The result of zrange withScores is an array like: [member1, score1, member2, score2]
  for (let i = 0; i < list.length; i += 2) {
    convos.push({
      username: list[i] as string,
      lastMessageAt: list[i + 1] as number,
    });
  }
  return convos;
}
