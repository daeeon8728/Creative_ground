'use server';

import { get } from '@vercel/edge-config';

// Fallback prompts in case edge config fails or is not found
const FALLBACK_PROMPTS = [
  "이번 주 테마: 텍스처만 모아보세요. 물체 전체 말고 표면의 질감에 집중해보세요.",
  "이번 주 테마: 색 팔레트를 3가지로 제한해보세요.",
  "이번 주 테마: 흑백만으로 구성한 보드를 만들어보세요.",
  "이번 주 테마: 자연에서 찾은 것들로 채워보세요.",
  "이번 주 테마: '느린 삶'을 주제로 이미지를 모아보세요.",
  "이번 주 테마: 빛과 그림자에 집중해보세요.",
  "이번 주 테마: 좋아하는 계절의 색을 담아보세요.",
  "이번 주 테마: 손으로 만든 것들만 골라보세요.",
];

export async function getWeeklyPrompt(): Promise<string> {
  try {
    const prompt = await get<string>('weekly_prompt');
    if (prompt) return prompt;
  } catch (err) {
    // Suppress console.error so it doesn't trigger Next.js dev overlay
    // console.warn('Edge config not available, using fallback');
  }
  
  // Fallback
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return FALLBACK_PROMPTS[week % FALLBACK_PROMPTS.length];
}
