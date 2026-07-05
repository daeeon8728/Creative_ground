import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `보드 — Fragments` };
}

export default async function BoardPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect('/');

  const { id } = await params;
  if (!id) notFound();

  return <BoardCanvas boardId={id} />;
}
