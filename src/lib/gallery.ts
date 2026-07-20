import { Redis } from '@upstash/redis';
import type { GalleryPost, GalleryPostFull, GalleryComment, SceneData } from './scene-types';

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
  await Promise.all([
    redis.set(`gallery:post:${post.id}`, meta),
    redis.set(`gallery:scene:${post.id}`, scene),
    redis.zadd('gallery:index', { score: post.createdAt, member: post.id }),
  ]);
}

export async function deleteGalleryPost(id: string, userId: string): Promise<boolean> {
  const post = await redis.get<GalleryPost>(`gallery:post:${id}`);
  if (!post || post.userId !== userId) return false;
  await Promise.all([
    redis.del(`gallery:post:${id}`),
    redis.del(`gallery:scene:${id}`),
    redis.del(`gallery:comments:${id}`),
    redis.zrem('gallery:index', id),
  ]);
  return true;
}

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

// ─── Comments ─────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<GalleryComment[]> {
  const comments = await redis.lrange<GalleryComment>(`gallery:comments:${postId}`, 0, -1);
  return comments ?? [];
}

export async function addComment(postId: string, comment: GalleryComment): Promise<void> {
  await redis.rpush(`gallery:comments:${postId}`, comment);
}
