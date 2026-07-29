'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Props {
  targetUsername: string;
}

export default function FollowButton({ targetUsername }: Props) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profile/${targetUsername}/follow`)
      .then((res) => res.json())
      .then((data) => {
        setIsFollowing(data.following ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [targetUsername]);

  async function handleToggle() {
    if (!session) {
      alert('Please sign in to follow users.');
      return;
    }
    setLoading(true);
    const method = isFollowing ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/profile/${targetUsername}/follow`, { method });
      if (res.ok) {
        setIsFollowing(!isFollowing);
      } else {
        alert('Action failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={`toolbar-btn large ${isFollowing ? '' : 'accent'}`}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
}
