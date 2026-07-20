import { Redis } from '@upstash/redis';
import type { GalleryPost, GalleryPostFull, GalleryComment, GalleryReaction, SceneData } from './scene-types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ─── Gallery Posts ────────────────────────────────────────────────

export async function getGalleryPosts(limit = 20, offset = 0): Promise<GalleryPost[]> {
  const ids = await redis.zrange('gallery:index', offset, offset + limit - 1, { rev: true });
  if (!ids.length) return [];
  const posts = await Promise.all(ids.map((id) => redis.get<GalleryPost>(`gallery:post:${id}`)));
  return posts.filter(Boolean) as GalleryPost[];
}

export async function getGalleryPost(id: string): Promise<GalleryPostFull | null> {
  const [post, scene] = await Promise.all([
    redis.get<GalleryPost>(`gallery:post:${id}`),
    redis.get<SceneData>(`gallery:scene:${id}`),
  ]);
  if (!post || !scene) return null;
  return { ...post, scene };
}

export async function createGalleryPost(post: GalleryPostFull): Promise<void> {
  const { scene, ...meta } = post;
  const safeMeta: GalleryPost = {
    ...meta,
    reactions: meta.reactions ?? [],
    views: meta.views ?? 0,
    likes: meta.likes ?? [],
  };
  await Promise.all([
    redis.set(`gallery:post:${post.id}`, safeMeta),
    redis.set(`gallery:scene:${post.id}`, scene),
    redis.zadd('gallery:index', { score: post.createdAt, member: post.id }),
  ]);
}

// Owner delete — only deletes if userId matches
export async function deleteGalleryPost(id: string, userId: string): Promise<boolean> {
  const post = await redis.get<GalleryPost>(`gallery:post:${id}`);
  if (!post || post.userId !== userId) return false;
  return _doDelete(id);
}

// Admin delete — no ownership check
export async function deleteGalleryPostAdmin(id: string): Promise<boolean> {
  const post = await redis.get<GalleryPost>(`gallery:post:${id}`);
  if (!post) return false;
  return _doDelete(id);
}

async function _doDelete(id: string): Promise<boolean> {
  await Promise.all([
    redis.del(`gallery:post:${id}`),
    redis.del(`gallery:scene:${id}`),
    redis.del(`gallery:comments:${id}`),
    redis.zrem('gallery:index', id),
  ]);
  return true;
}

// ─── Likes (legacy) ──────────────────────────────────────────────

export async function toggleLike(postId: string, userId: string): Promise<string[]> {
  const post = await redis.get<GalleryPost>(`gallery:post:${postId}`);
  if (!post) return [];
  const likes = post.likes ?? [];
  const idx = likes.indexOf(userId);
  if (idx === -1) likes.push(userId);
  else likes.splice(idx, 1);
  await redis.set(`gallery:post:${postId}`, { ...post, likes });
  return likes;
}

// ─── Emoji Reactions ─────────────────────────────────────────────

export async function toggleReaction(
  postId: string,
  emoji: string,
  userId: string,
): Promise<GalleryReaction[]> {
  const post = await redis.get<GalleryPost>(`gallery:post:${postId}`);
  if (!post) return [];

  const reactions: GalleryReaction[] = post.reactions ?? [];
  const existing = reactions.find((r) => r.emoji === emoji);

  if (existing) {
    const idx = existing.userIds.indexOf(userId);
    if (idx === -1) {
      existing.userIds.push(userId);
    } else {
      existing.userIds.splice(idx, 1);
    }
    // Remove reaction entry if no users left
    if (existing.userIds.length === 0) {
      reactions.splice(reactions.indexOf(existing), 1);
    }
  } else {
    reactions.push({ emoji, userIds: [userId] });
  }

  await redis.set(`gallery:post:${postId}`, { ...post, reactions });
  return reactions;
}

// ─── View Counter ─────────────────────────────────────────────────

export async function incrementViews(postId: string): Promise<number> {
  const post = await redis.get<GalleryPost>(`gallery:post:${postId}`);
  if (!post) return 0;
  const views = (post.views ?? 0) + 1;
  await redis.set(`gallery:post:${postId}`, { ...post, views });
  return views;
}

// ─── Comments ─────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<GalleryComment[]> {
  const comments = await redis.lrange<GalleryComment>(`gallery:comments:${postId}`, 0, -1);
  return comments ?? [];
}

export async function addComment(postId: string, comment: GalleryComment): Promise<void> {
  await redis.rpush(`gallery:comments:${postId}`, comment);
}

// ─── Admin: User List ─────────────────────────────────────────────

export interface StoredUserPublic {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  createdAt: number;
  lastLogin?: number;
  loginCount?: number;
}

export async function getAllUsers(): Promise<StoredUserPublic[]> {
  const ids = await redis.smembers<string[]>('users');
  if (!ids?.length) return [];
  const users = await Promise.all(ids.map((id) => redis.get<StoredUserPublic>(`user:id:${id}`)));
  return users.filter(Boolean).map((u) => {
    const user = u as StoredUserPublic;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { passwordHash: _, ...safe } = user as any;
    return safe as StoredUserPublic;
  });
}
