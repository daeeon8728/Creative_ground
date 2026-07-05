import { Redis } from '@upstash/redis';
import type { BoardKind } from './types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ─── Types ──────────────────────────────────────────────────────

export interface ForumBoard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  createdBy: string; // admin userId
  createdAt: number;
  isOfficial: boolean;
  postCount: number;
}

export interface ForumPost {
  id: string;
  boardId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  likeCount: number;
  commentCount: number;
  // Optional: a shared board attached to this post
  sharedBoardId?: string;
  sharedBoardName?: string;
  sharedBoardKind?: BoardKind;
}

export interface ForumComment {
  id: string;
  postId: string;
  boardId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  likeCount: number;
}

export interface BoardCreationRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  title: string;
  description: string;
  emoji: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

// ─── Forum Boards ──────────────────────────────────────────────

export async function listForumBoards(): Promise<ForumBoard[]> {
  const ids = await redis.zrange('forum:boards', 0, -1, { rev: true }) as string[];
  if (!ids.length) return [];
  const boards = await Promise.all(ids.map(id => redis.get(`forum:board:${id}`)));
  return boards.filter((b): b is ForumBoard => Boolean(b));
}

export async function getForumBoard(id: string): Promise<ForumBoard | null> {
  return redis.get(`forum:board:${id}`);
}

export async function createForumBoard(board: Omit<ForumBoard, 'postCount'>): Promise<ForumBoard> {
  const full: ForumBoard = { ...board, postCount: 0 };
  await Promise.all([
    redis.set(`forum:board:${board.id}`, full),
    redis.zadd('forum:boards', { score: board.createdAt, member: board.id }),
  ]);
  return full;
}

export async function deleteForumBoard(id: string): Promise<void> {
  await Promise.all([
    redis.del(`forum:board:${id}`),
    redis.zrem('forum:boards', id),
  ]);
}

// ─── Posts ─────────────────────────────────────────────────────

export async function listPosts(boardId: string, limit = 20, offset = 0): Promise<ForumPost[]> {
  const ids = await redis.zrange(`forum:posts:${boardId}`, offset, offset + limit - 1, { rev: true }) as string[];
  if (!ids.length) return [];
  const posts = await Promise.all(ids.map(id => redis.get(`forum:post:${boardId}:${id}`)));
  return posts.filter((p): p is ForumPost => Boolean(p));
}

export async function getPost(boardId: string, postId: string): Promise<ForumPost | null> {
  return redis.get(`forum:post:${boardId}:${postId}`);
}

export async function createPost(post: ForumPost): Promise<void> {
  await Promise.all([
    redis.set(`forum:post:${post.boardId}:${post.id}`, post),
    redis.zadd(`forum:posts:${post.boardId}`, { score: post.createdAt, member: post.id }),
    redis.hincrby('forum:board-counts', post.boardId, 1),
  ]);
  // Update post count in board
  const board = await getForumBoard(post.boardId);
  if (board) {
    board.postCount += 1;
    await redis.set(`forum:board:${post.boardId}`, board);
  }
}

export async function deletePost(boardId: string, postId: string): Promise<void> {
  await Promise.all([
    redis.del(`forum:post:${boardId}:${postId}`),
    redis.zrem(`forum:posts:${boardId}`, postId),
  ]);
  const board = await getForumBoard(boardId);
  if (board && board.postCount > 0) {
    board.postCount -= 1;
    await redis.set(`forum:board:${boardId}`, board);
  }
}

// ─── Likes ─────────────────────────────────────────────────────

export async function togglePostLike(postId: string, boardId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const key = `forum:likes:post:${postId}`;
  const already = await redis.sismember(key, userId);
  const post = await getPost(boardId, postId);
  if (!post) return { liked: false, count: 0 };

  if (already) {
    await redis.srem(key, userId);
    post.likeCount = Math.max(0, post.likeCount - 1);
  } else {
    await redis.sadd(key, userId);
    post.likeCount += 1;
  }
  await redis.set(`forum:post:${boardId}:${postId}`, post);
  return { liked: !already, count: post.likeCount };
}

export async function getPostLikedByUser(postId: string, userId: string): Promise<boolean> {
  return Boolean(await redis.sismember(`forum:likes:post:${postId}`, userId));
}

// ─── Comments ──────────────────────────────────────────────────

export async function listComments(postId: string): Promise<ForumComment[]> {
  const ids = await redis.zrange(`forum:comments:${postId}`, 0, -1) as string[];
  if (!ids.length) return [];
  const comments = await Promise.all(ids.map(id => redis.get(`forum:comment:${postId}:${id}`)));
  return comments.filter((c): c is ForumComment => Boolean(c));
}

export async function addComment(comment: ForumComment): Promise<void> {
  await Promise.all([
    redis.set(`forum:comment:${comment.postId}:${comment.id}`, comment),
    redis.zadd(`forum:comments:${comment.postId}`, { score: comment.createdAt, member: comment.id }),
  ]);
  // Update comment count
  const post = await getPost(comment.boardId, comment.postId);
  if (post) {
    post.commentCount += 1;
    await redis.set(`forum:post:${comment.boardId}:${comment.postId}`, post);
  }
}

// ─── Board Creation Requests ───────────────────────────────────

export async function submitBoardRequest(req: BoardCreationRequest): Promise<void> {
  await Promise.all([
    redis.set(`forum:board-request:${req.id}`, req),
    redis.zadd('forum:board-requests', { score: req.createdAt, member: req.id }),
  ]);
}

export async function listBoardRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<BoardCreationRequest[]> {
  const ids = await redis.zrange('forum:board-requests', 0, -1, { rev: true }) as string[];
  if (!ids.length) return [];
  const reqs = await Promise.all(ids.map(id => redis.get<BoardCreationRequest>(`forum:board-request:${id}`)));
  const filtered = reqs.filter((r): r is BoardCreationRequest => Boolean(r));
  return status ? filtered.filter(r => r.status === status) : filtered;
}

export async function updateBoardRequestStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const req = await redis.get<BoardCreationRequest>(`forum:board-request:${id}`);
  if (req) {
    req.status = status;
    await redis.set(`forum:board-request:${id}`, req);
  }
}
