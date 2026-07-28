import ChatRoom from './ChatRoom';

export default async function ChatUserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ChatRoom targetUsername={username} />;
}
