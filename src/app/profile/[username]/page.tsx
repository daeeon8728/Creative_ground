import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserByUsername } from '@/lib/auth';
import { getUserPosts } from '@/lib/gallery';
import GalleryCard from '@/components/gallery/GalleryCard';

export const revalidate = 60; // ISR

export const metadata = {
  title: 'Forge3D — Profile',
};

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) {
    notFound();
  }

  const posts = await getUserPosts(user.username);
  
  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort((a, b) => b.createdAt - a.createdAt);

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length ?? 0), 0);
  const totalViews = posts.reduce((sum, p) => sum + (p.views ?? 0), 0);

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div className="gallery-header-left">
          <Link href="/gallery" className="projects-logo">⬡ FORGE3D</Link>
        </div>
        <div className="button-row" style={{ margin: 0 }}>
          <Link href="/projects" className="toolbar-btn">
            My Projects
          </Link>
          <Link href="/gallery" className="toolbar-btn accent">
            Gallery
          </Link>
        </div>
      </header>

      <main className="gallery-main" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="profile-header">
          <div className="profile-info">
            <h1 className="profile-username">@{user.username}</h1>
            <p className="profile-name">{user.name}</p>
            <div className="profile-stats">
              <div className="stat-box">
                <span className="stat-value">{posts.length}</span>
                <span className="stat-label">Scenes</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{totalLikes}</span>
                <span className="stat-label">Likes</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{totalViews}</span>
                <span className="stat-label">Views</span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            <button className="toolbar-btn accent large" disabled>
              Follow (coming soon)
            </button>
            <button className="toolbar-btn large" disabled>
              Message (coming soon)
            </button>
          </div>
        </div>

        <div className="inspector-divider" style={{ margin: '2rem 0' }} />

        <h2 className="gallery-ranking-title">Portfolio</h2>
        
        {sortedPosts.length === 0 ? (
          <div className="projects-empty">
            <div className="projects-empty-icon">🎨</div>
            <h2>No scenes yet</h2>
            <p>This user hasn't shared any scenes to the gallery.</p>
          </div>
        ) : (
          <div className="gallery-masonry-grid">
            {sortedPosts.map((post) => (
              <GalleryCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
