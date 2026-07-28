import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

/**
 * Follow a user
 */
export async function followUser(followerUsername: string, targetUsername: string): Promise<void> {
  const followerLower = followerUsername.toLowerCase().trim();
  const targetLower = targetUsername.toLowerCase().trim();
  if (followerLower === targetLower) return; // Cannot follow self

  await Promise.all([
    redis.sadd(`user:following:${followerLower}`, targetLower),
    redis.sadd(`user:followers:${targetLower}`, followerLower),
  ]);
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerUsername: string, targetUsername: string): Promise<void> {
  const followerLower = followerUsername.toLowerCase().trim();
  const targetLower = targetUsername.toLowerCase().trim();

  await Promise.all([
    redis.srem(`user:following:${followerLower}`, targetLower),
    redis.srem(`user:followers:${targetLower}`, followerLower),
  ]);
}

/**
 * Check if followerUsername is following targetUsername
 */
export async function isFollowing(followerUsername: string, targetUsername: string): Promise<boolean> {
  const followerLower = followerUsername.toLowerCase().trim();
  const targetLower = targetUsername.toLowerCase().trim();
  const result = await redis.sismember(`user:following:${followerLower}`, targetLower);
  return result === 1;
}

/**
 * Get follower and following counts for a user
 */
export async function getFollowStats(username: string): Promise<{ followers: number; following: number }> {
  const lower = username.toLowerCase().trim();
  const [followers, following] = await Promise.all([
    redis.scard(`user:followers:${lower}`),
    redis.scard(`user:following:${lower}`),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}
