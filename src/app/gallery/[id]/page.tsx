import { notFound } from 'next/navigation';
import { getGalleryPost, getComments } from '@/lib/gallery';
import GalleryDetailClient from './GalleryDetailClient';
import type { GalleryComment } from '@/lib/scene-types';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await getGalleryPost(id);
    if (!post) return { title: 'Forge3D — Not Found' };
    return {
      title: `${post.title} — Forge3D Gallery`,
      description: post.description,
    };
  } catch {
    return { title: 'Forge3D' };
  }
}

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let post = null;
  let comments: GalleryComment[] = [];
  try {
    [post, comments] = await Promise.all([
      getGalleryPost(id),
      getComments(id),
    ]);
  } catch {
    // Redis might not be configured in dev
  }

  if (!post) notFound();

  return <GalleryDetailClient post={post!} comments={comments} postId={id} />;
}
