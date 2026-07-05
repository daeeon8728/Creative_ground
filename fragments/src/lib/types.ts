export type BoardKind = 'home' | 'outfit' | 'trip' | 'event' | 'gift' | 'freeform';
export type ItemType = 'image' | 'text' | 'shape' | 'drawing';
export type ShapeType = 'rect' | 'circle' | 'triangle';
export type ActiveTool = 'select' | 'draw' | 'text' | 'shape';
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface CanvasItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  // Image
  imageId?: string;
  blendMode?: string;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
  opacity?: number;
  // Text
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  // Shape
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDash?: 'solid' | 'dashed' | 'dotted';
  cornerRadius?: number;
  // Drawing
  drawingPath?: string;
  drawingColor?: string;
  drawingWidth?: number;
  // Planning data layer
  price?: number;
  sourceUrl?: string;
  checked?: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  label?: string;
  aiSuggested?: boolean;
}

export interface BoardCheckpoint {
  at: number;
  items: CanvasItem[];
}

export interface BoardData {
  id: string;
  kind: BoardKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: CanvasItem[];
  checkpoints: BoardCheckpoint[];
  shareId?: string;
  aiPrompt?: string;
  aiPromptUpdatedAt?: number;
}

export const KIND_META: Record<BoardKind, { label: string; emoji: string; desc: string; accent: string }> = {
  home:     { label: '인테리어',    emoji: '🏠', desc: '방 꾸미기, 가구, 인테리어 아이디어', accent: '#c4a882' },
  outfit:   { label: '옷장 정리',   emoji: '👗', desc: '코디 계획, 캡슐 워드로브, 쇼핑 리스트', accent: '#8ea8d8' },
  trip:     { label: '여행 계획',   emoji: '✈️', desc: '여행지, 짐 싸기, 일정 & 루트', accent: '#7fb87a' },
  event:    { label: '이벤트',      emoji: '🎉', desc: '결혼식, 파티, 기념일 — 벤더 & 예산', accent: '#d48a78' },
  gift:     { label: '선물 리스트', emoji: '🎁', desc: '특별한 사람을 위한 선물 아이디어', accent: '#a87fd4' },
  freeform: { label: '자유 보드',   emoji: '✦',  desc: '제한 없이 — 무엇이든 담아보세요', accent: '#d4c878' },
};
