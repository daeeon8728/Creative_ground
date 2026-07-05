import { nanoid } from 'nanoid';
import type { BoardKind, CanvasItem } from './types';

// Helper to generate text items quickly
function t(text: string, x: number, y: number, w = 240, h = 80, fontSize = 20, weight = '400', align: 'left' | 'center' | 'right' = 'left'): CanvasItem {
  return {
    id: nanoid(), type: 'text', text,
    x, y, width: w, height: h,
    fontSize, fontWeight: weight, textAlign: align, textColor: 'var(--ink)',
    rotation: 0, zIndex: 1,
  };
}

// Helper to generate shape items (sticky notes) quickly
function sticky(x: number, y: number, color: string): CanvasItem {
  return {
    id: nanoid(), type: 'shape', shapeType: 'rect',
    x, y, width: 200, height: 200,
    fillColor: color, strokeColor: 'var(--ink)', strokeWidth: 2,
    rotation: Math.random() * 6 - 3, zIndex: 0,
  };
}

// Pre-defined layouts for each purpose
export function getStarterItems(kind: BoardKind): CanvasItem[] {
  const items: CanvasItem[] = [];
  const yellow = 'var(--riso-yellow)';
  const blue = 'var(--riso-blue)';
  const coral = 'var(--riso-coral)';

  switch (kind) {
    case 'home':
      items.push(
        t('🛋 거실 레이아웃', 100, 100, 300, 60, 32, '700'),
        t('창가에 식물을 배치하고 싶다.\n소파는 3인용, 컬러는 베이지나 머스터드?', 100, 180, 400, 100, 18),
        sticky(600, 100, yellow),
        t('러그 후보', 620, 140, 160, 120, 20)
      );
      break;

    case 'outfit':
      items.push(
        t('👕 여름 휴가 워드로브', 100, 100, 400, 60, 32, '700'),
        t('가볍고 짐이 적은 캡슐 워드로브 구성하기', 100, 180, 400, 60, 18),
        sticky(100, 300, blue),
        t('TOP', 120, 340, 160, 100, 24, '600', 'center'),
        sticky(350, 300, yellow),
        t('BOTTOM', 370, 340, 160, 100, 24, '600', 'center'),
        sticky(600, 300, coral),
        t('SHOES', 620, 340, 160, 100, 24, '600', 'center')
      );
      break;

    case 'trip':
      items.push(
        t('✈️ 도쿄 3박 4일 일정', 100, 100, 400, 60, 32, '700'),
        sticky(100, 200, yellow),
        t('DAY 1\n\n- 나리타 도착\n- 숙소 체크인\n- 저녁: 야키토리', 120, 220, 160, 160, 18),
        sticky(350, 200, yellow),
        t('DAY 2\n\n- 시부야\n- 오모테산도 카페\n- 쇼핑', 370, 220, 160, 160, 18),
        sticky(600, 200, yellow),
        t('DAY 3\n\n- 디즈니랜드!\n- 불꽃놀이', 620, 220, 160, 160, 18)
      );
      break;

    case 'event':
      items.push(
        t('🎉 생일 파티 준비', 100, 100, 400, 60, 32, '700'),
        sticky(100, 200, coral),
        t('초대할 사람', 120, 220, 160, 60, 20, '600'),
        sticky(350, 200, blue),
        t('케이크 주문\n(레터링 픽업)', 370, 220, 160, 60, 20, '600'),
        sticky(600, 200, yellow),
        t('파티룸 예약', 620, 220, 160, 60, 20, '600')
      );
      break;

    case 'gift':
      items.push(
        t('🎁 연말 선물 리스트', 100, 100, 400, 60, 32, '700'),
        t('예산: 총 30만원', 100, 180, 200, 60, 20),
        sticky(100, 250, yellow),
        t('엄마: 스카프', 120, 290, 160, 60, 20),
        sticky(350, 250, yellow),
        t('아빠: 영양제', 370, 290, 160, 60, 20),
        sticky(600, 250, yellow),
        t('동생: 무선이어폰', 620, 290, 160, 60, 20)
      );
      break;

    case 'freeform':
      items.push(
        t('✦ 자유 보드', 100, 100, 300, 60, 32, '700'),
        t('아무거나 드래그 앤 드롭해서 시작하세요.', 100, 180, 400, 60, 20)
      );
      break;
  }

  // Assign sequential z-index to avoid issues
  return items.map((item, i) => ({ ...item, zIndex: i + 1 }));
}
