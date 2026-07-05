import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUserById, getUserById } from "@/lib/admin-users";

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete current admin" }, { status: 400 });
  }

  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "admin") {
    return NextResponse.json({ error: "Cannot delete admin user" }, { status: 400 });
  }

  await deleteUserById(id);
  return NextResponse.json({ ok: true });
}
