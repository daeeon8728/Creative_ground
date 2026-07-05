import { NextResponse } from 'next/server';
import { aiRateLimit, callNemotron, parseAiJson } from '@/lib/ai';

interface SummaryResponse {
  summary?: string;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await aiRateLimit.limit(ip);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { comments } = await req.json();
    if (!Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: 'Missing comments' }, { status: 400 });
    }

    const cleanComments = comments
      .map((comment) => String(comment?.text ?? '').trim())
      .filter(Boolean)
      .slice(-50);

    const systemPrompt = `You summarize visitor feedback for a shared collage board.
Comments: ${JSON.stringify(cleanComments)}.

Write a short Korean summary. Mention repeated praise, repeated concerns, and any clear action item. Keep it under 3 sentences.
Return ONLY valid JSON:
{ "summary": "..." }`;

    const aiResponse = await callNemotron('Summarize this feedback.', {
      systemPrompt,
      temperature: 0.4,
      maxTokens: 320,
      jsonMode: true,
    });

    const parsed = parseAiJson<SummaryResponse>(aiResponse);
    return NextResponse.json({ summary: parsed.summary || '피드백을 요약할 만큼 뚜렷한 공통점은 아직 적습니다.' });
  } catch (err) {
    console.error('Feedback summary API Error:', err);
    return NextResponse.json({ error: 'Failed to summarize feedback' }, { status: 500 });
  }
}
