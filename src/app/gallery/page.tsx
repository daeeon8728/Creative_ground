import Link from 'next/link';
import { getGalleryPosts } from '@/lib/gallery';
import { getPostScore } from '@/lib/scene-types';
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

function getTotalReactions(post: GalleryPost): number {
  return (post.reactions ?? []).reduce((s, r) => s + r.userIds.length, 0) + (post.likes ?? []).length;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export const revalidate = 60;

export const metadata = {
  title: 'Forge3D — Gallery',
  description: 'Browse 3D scenes shared by the community',
};

export default async function GalleryPage() {
  let posts: GalleryPost[] = [];
  try {
    posts = await getGalleryPosts(50);
  } catch {
    // Redis might not be configured
  }

  // Sort by score for ranking
  const sorted = [...posts].sort((a, b) => getPostScore(b) - getPostScore(a));
  const rankMap = new Map<string, number>();
  sorted.forEach((p, i) => {
    if (i < 3 && getPostScore(p) > 0) rankMap.set(p.id, i);
  });

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
          <>
            {/* Top 3 ranking section */}
            {sorted.filter((p) => rankMap.has(p.id)).length > 0 && (
              <section className="gallery-ranking">
                <h2 className="gallery-ranking-title">🏆 Top Ranked</h2>
                <div className="gallery-ranking-grid">
                  {sorted.filter((p) => rankMap.has(p.id)).map((post) => {
                    const rank = rankMap.get(post.id)!;
                    return (
                      <Link key={post.id} href={`/gallery/${post.id}`} className={`gallery-card ranking-card rank-${rank + 1}`}>
                        <div className="ranking-medal">{RANK_MEDALS[rank]}</div>
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
                            <span>👁 {post.views ?? 0}</span>
                            <span>·</span>
                            <span>❤️ {getTotalReactions(post)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* All posts grid */}
            <div className="gallery-grid">
              {posts.map((post) => {
                const rank = rankMap.get(post.id);
                return (
                  <Link key={post.id} href={`/gallery/${post.id}`} className="gallery-card">
                    {rank !== undefined && (
                      <span className="gallery-card-medal">{RANK_MEDALS[rank]}</span>
                    )}
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
                        <span>👁 {post.views ?? 0}</span>
                        <span>·</span>
                        <span>❤️ {getTotalReactions(post)}</span>
                      </div>
                      {post.description && (
                        <p className="gallery-card-desc">{post.description}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
