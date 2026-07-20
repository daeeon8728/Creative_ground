import EditorClient from './EditorClient';

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return { title: `Forge3D — Editor` };
}

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <EditorClient projectId={projectId} />;
}
