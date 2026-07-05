import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/admin-users";
import { AdminUsersTable } from "@/components/AdminUsersTable";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (session.user.role !== "admin") redirect("/boards");

  const users = await listUsers();

  return (
    <main className="min-h-dvh bg-[var(--paper)] px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-[var(--pencil)]" style={{ fontFamily: "var(--font-mono)" }}>
              Admin
            </p>
            <h1 className="font-display text-5xl uppercase text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
              User management
            </h1>
          </div>
          <Link
            href="/boards"
            className="border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold uppercase tracking-wider text-[var(--paper)] shadow-riso-blue"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Back to boards
          </Link>
        </header>

        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Total users" value={String(users.length)} />
          <Stat label="Admins" value={String(users.filter((user) => user.role === "admin").length)} />
          <Stat label="Regular users" value={String(users.filter((user) => user.role !== "admin").length)} />
        </section>

        <AdminUsersTable users={users} currentUserId={session.user.id} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 shadow-riso-sm-yellow">
      <p className="text-xs uppercase tracking-widest text-[var(--pencil)]" style={{ fontFamily: "var(--font-mono)" }}>
        {label}
      </p>
      <p className="font-display text-3xl uppercase text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
    </div>
  );
}
