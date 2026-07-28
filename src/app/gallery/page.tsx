import Link from 'next/link';
import { getGalleryPosts } from '@/lib/gallery';
import { getPostScore } from '@/lib/scene-types';
import type { GalleryPost } from '@/lib/scene-types';
import GalleryCard from '@/components/gallery/GalleryCard';



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
                    return <GalleryCard key={post.id} post={post} rank={rank} rankMedal={RANK_MEDALS[rank]} />;
                  })}
                </div>
              </section>
            )}

            {/* All posts grid - Masonry */}
            <div className="gallery-masonry-grid">
              {posts.map((post) => {
                const rank = rankMap.get(post.id);
                return <GalleryCard key={post.id} post={post} rankMedal={rank !== undefined ? RANK_MEDALS[rank] : undefined} />;
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
