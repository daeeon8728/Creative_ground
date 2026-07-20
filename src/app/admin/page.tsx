import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAllUsers } from '@/lib/gallery';
import type { StoredUserPublic } from '@/lib/gallery';

export const metadata = { title: 'Forge3D — Admin Dashboard' };

function formatDate(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect('/');
  if (session.user.role !== 'admin') notFound();

  let users: StoredUserPublic[] = [];
  try {
    users = await getAllUsers();
    users.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch {
    // Redis might not be configured in dev
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <a href="/projects" className="toolbar-btn">← Back</a>
          <h1 className="admin-title">⚙ Admin Dashboard</h1>
        </div>
        <p className="admin-subtitle font-mono">
          {users.length} registered users
        </p>
      </header>

      <main className="admin-main">
        <h2 className="admin-section-title">👥 Users</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Login Count</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.role === 'admin' ? 'admin-row' : ''}>
                  <td className="admin-cell-username">@{u.username}</td>
                  <td>{u.name}</td>
                  <td className="font-mono text-sm">{u.email}</td>
                  <td>
                    <span className={`admin-role-badge ${u.role === 'admin' ? 'is-admin' : ''}`}>
                      {u.role ?? 'user'}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{formatDate(u.createdAt)}</td>
                  <td className="font-mono text-xs">{formatDate(u.lastLogin)}</td>
                  <td className="text-center font-bold">{u.loginCount ?? 0}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-empty">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
