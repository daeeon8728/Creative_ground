import Link from 'next/link';
import { getGalleryPosts } from '@/lib/gallery';
import type { GalleryPost } from '@/lib/scene-types';

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const revalidate = 60;

export const metadata = {
  title: 'Forge3D — Gallery',
  description: 'Browse 3D scenes shared by the community',
};

export default async function GalleryPage() {
  let posts: GalleryPost[] = [];
  try {
    posts = await getGalleryPosts(24);
  } catch {
    // Redis might not be configured
  }

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div className="gallery-header-left">
          <Link href="/" className="projects-logo">⬡ FORGE3D</Link>
          <h1 className="gallery-title">Community Gallery</h1>
        </div>
        <Link href="/projects" className="toolbar-btn accent">
          My Projects →
        </Link>
      </header>

      <main className="gallery-main">
        {posts.length === 0 ? (
          <div className="projects-empty">
            <div className="projects-empty-icon">🌐</div>
            <h2>No shared scenes yet</h2>
            <p>Be the first to share your 3D creation!</p>
            <Link href="/projects" className="toolbar-btn accent large">
              Create a Scene
            </Link>
          </div>
        ) : (
          <div className="gallery-grid">
            {posts.map((post) => (
              <Link key={post.id} href={`/gallery/${post.id}`} className="gallery-card">
                <div className="gallery-card-thumb">
                  {post.thumbnail ? (
                    <img src={post.thumbnail} alt={post.title} />
                  ) : (
                    <div className="gallery-card-placeholder">⬡</div>
                  )}
                </div>
                <div className="gallery-card-info">
                  <p className="gallery-card-title">{post.title}</p>
                  <div className="gallery-card-meta">
                    <span>@{post.username}</span>
                    <span>·</span>
                    <span>{timeAgo(post.createdAt)}</span>
                    <span>·</span>
                    <span>❤️ {post.likes?.length ?? 0}</span>
                  </div>
                  {post.description && (
                    <p className="gallery-card-desc">{post.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
