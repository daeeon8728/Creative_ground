import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface Notification {
  id: string;
  type: 'comment' | 'follow';
  actor: string; // The user who did the action
  link: string;  // Link to the post or profile
  createdAt: number;
  read: boolean;
}

export async function getNotifications(username: string): Promise<Notification[]> {
  const lower = username.toLowerCase().trim();
  const key = `notifications:${lower}`;
  const items = await redis.lrange(key, 0, 49); // get up to 50
  return items.map((i) => (typeof i === 'string' ? JSON.parse(i) : i));
}

export async function createNotification(
  targetUsername: string,
  type: 'comment' | 'follow',
  actor: string,
  link: string
) {
  const lowerTarget = targetUsername.toLowerCase().trim();
  const lowerActor = actor.toLowerCase().trim();

  if (lowerTarget === lowerActor) return; // Don't notify yourself

  const notification: Notification = {
    id: randomUUID(),
    type,
    actor,
    link,
    createdAt: Date.now(),
    read: false,
  };

  const key = `notifications:${lowerTarget}`;
  // Push to start of list, keep max 100
  const pipeline = redis.pipeline();
  pipeline.lpush(key, JSON.stringify(notification));
  pipeline.ltrim(key, 0, 99);
  await pipeline.exec();
}

export async function markNotificationsAsRead(username: string) {
  const lower = username.toLowerCase().trim();
  const key = `notifications:${lower}`;
  
  // To avoid race conditions, simplest way is to fetch, modify, and rewrite
  // Or we just delete the list for "mark all read" (too destructive)
  // Let's rewrite the list
  const items = await redis.lrange(key, 0, -1);
  if (items.length === 0) return;

  const updatedItems = items.map(i => {
    const parsed = typeof i === 'string' ? JSON.parse(i) : i;
    parsed.read = true;
    return JSON.stringify(parsed);
  });

  const pipeline = redis.pipeline();
  pipeline.del(key);
  // Need to push in reverse order since lpush reverses it, 
  // or use rpush to keep the order.
  pipeline.rpush(key, ...updatedItems);
  await pipeline.exec();
}
