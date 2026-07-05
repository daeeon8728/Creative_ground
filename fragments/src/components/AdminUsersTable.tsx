"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminUserView } from "@/lib/admin-users";

interface Props {
  users: AdminUserView[];
  currentUserId: string;
}

export function AdminUsersTable({ users, currentUserId }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteUser(user: AdminUserView) {
    if (user.id === currentUserId || user.role === "admin") return;
    const ok = window.confirm(`Delete user ${user.username}?`);
    if (!ok) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--surface)] overflow-hidden">
      <div className="grid grid-cols-[1.1fr_1.4fr_1fr_0.7fr_0.8fr] gap-3 border-b-2 border-[var(--ink)] bg-[var(--surface-2)] px-4 py-3 text-xs uppercase tracking-widest text-[var(--pencil)]" style={{ fontFamily: "var(--font-mono)" }}>
        <span>Name</span>
        <span>Email</span>
        <span>Username</span>
        <span>Role</span>
        <span className="text-right">Action</span>
      </div>

      {users.map((user) => {
        const protectedUser = user.id === currentUserId || user.role === "admin";
        return (
          <div
            key={user.id}
            className="grid grid-cols-[1.1fr_1.4fr_1fr_0.7fr_0.8fr] gap-3 items-center border-b border-[var(--pencil)]/30 px-4 py-3 text-sm text-[var(--ink)] last:border-b-0"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-[var(--pencil)] font-mono truncate">{user.id}</p>
            </div>
            <span className="truncate">{user.email}</span>
            <span className="truncate">{user.username}</span>
            <span className={user.role === "admin" ? "text-[var(--riso-coral)] font-semibold" : ""}>
              {user.role}
            </span>
            <div className="flex justify-end">
              <button
                onClick={() => deleteUser(user)}
                disabled={protectedUser || deletingId === user.id}
                className="border-2 border-[var(--ink)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--ink)] hover:bg-[var(--riso-coral)] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--ink)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {deletingId === user.id ? "..." : protectedUser ? "Locked" : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
