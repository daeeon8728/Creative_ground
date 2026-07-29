import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserByUsername, auth } from '@/lib/auth';
import { getUserPosts } from '@/lib/gallery';
import { getFollowStats } from '@/lib/social';
import GalleryCard from '@/components/gallery/GalleryCard';
import FollowButton from '@/components/profile/FollowButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/ui/NotificationBell';

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
  const { followers, following } = await getFollowStats(user.username);
  const session = await auth();
  const isSelf = session?.user?.username === user.username;
  
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
        <div className="button-row" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NotificationBell />
          <ThemeToggle />
          <Link href="/projects" className="toolbar-btn">My Projects</Link>
          <Link href="/gallery" className="toolbar-btn">Gallery</Link>
        </div>
      </header>

      <main className="gallery-main" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="profile-hero">
          {/* Avatar circle */}
          <div className="profile-avatar">
            {user.username.slice(0, 1).toUpperCase()}
          </div>

          {/* Info block */}
          <div className="profile-info-block">
            <h1 className="profile-username">@{user.username}</h1>
            <p className="profile-name">{user.name}</p>

            {/* Stats row */}
            <div className="profile-stats">
              {[
                { value: posts.length, label: 'Scenes' },
                { value: followers, label: 'Followers' },
                { value: following, label: 'Following' },
                { value: totalLikes, label: 'Likes' },
                { value: totalViews, label: 'Views' },
              ].map(({ value, label }) => (
                <div className="stat-box" key={label}>
                  <span className="stat-value">{value}</span>
                  <span className="stat-label">{label}</span>
                </div>
              ))}
            </div>

            {/* Action buttons — always visible */}
            <div className="profile-actions">
              {isSelf ? (
                <Link href="/projects" className="toolbar-btn accent large">
                  ✏️ My Projects
                </Link>
              ) : (
                <>
                  <FollowButton targetUsername={user.username} />
                  <Link href={`/chat/${user.username}`} className="toolbar-btn large">
                    💬 Message
                  </Link>
                </>
              )}
            </div>
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
