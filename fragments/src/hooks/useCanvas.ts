'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { nanoid } from 'nanoid';
import { getBoard, saveBoard, getImageUrl, revokeImageUrls, saveImage } from '@/lib/db';
import type { ActiveTool, BoardData, CanvasItem, ShapeType } from '@/lib/types';

// ─── State ───────────────────────────────────────────────────

interface CanvasState {
  board: BoardData | null;
  selectedId: string | null;
  tool: ActiveTool;
  flippedId: string | null;
  imageUrls: Record<string, string>;
  past: CanvasItem[][];
  future: CanvasItem[][];
  editCount: number;
}

// ─── Actions ─────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_BOARD'; board: BoardData }
  | { type: 'SET_TOOL'; tool: ActiveTool }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_FLIPPED'; id: string | null }
  | { type: 'ADD_ITEM'; item: CanvasItem }
  | { type: 'UPDATE_ITEM'; id: string; updates: Partial<CanvasItem> }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'BRING_FORWARD'; id: string }
  | { type: 'SEND_BACKWARD'; id: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SHUFFLE_ITEMS' }
  | { type: 'SET_IMAGE_URL'; imageId: string; url: string }
  | { type: 'SET_BOARD_NAME'; name: string }
  | { type: 'UPDATE_BOARD_META'; updates: Partial<BoardData> };

function maxZIndex(items: CanvasItem[]): number {
  return items.reduce((m, i) => Math.max(m, i.zIndex), 0);
}

function reducer(state: CanvasState, action: Action): CanvasState {
  switch (action.type) {
    case 'LOAD_BOARD':
      return { ...state, board: action.board };

    case 'SET_TOOL':
      return { ...state, tool: action.tool, selectedId: null };

    case 'SELECT':
      return { ...state, selectedId: action.id, flippedId: null };

    case 'SET_FLIPPED':
      return { ...state, flippedId: action.id };

    case 'SET_IMAGE_URL':
      return { ...state, imageUrls: { ...state.imageUrls, [action.imageId]: action.url } };

    case 'SET_BOARD_NAME': {
      if (!state.board) return state;
      return { ...state, board: { ...state.board, name: action.name } };
    }

    case 'UPDATE_BOARD_META': {
      if (!state.board) return state;
      return { ...state, board: { ...state.board, ...action.updates } };
    }

    case 'ADD_ITEM': {
      if (!state.board) return state;
      const past = [...state.past, state.board.items];
      return {
        ...state,
        board: { ...state.board, items: [...state.board.items, action.item] },
        selectedId: action.item.id,
        past,
        future: [],
        editCount: state.editCount + 1,
      };
    }

    case 'UPDATE_ITEM': {
      if (!state.board) return state;
      const past = [...state.past, state.board.items];
      return {
        ...state,
        board: {
          ...state.board,
          items: state.board.items.map(i =>
            i.id === action.id ? { ...i, ...action.updates } : i
          ),
        },
        past,
        future: [],
        editCount: state.editCount + 1,
      };
    }

    case 'DELETE_ITEM': {
      if (!state.board) return state;
      const past = [...state.past, state.board.items];
      return {
        ...state,
        board: { ...state.board, items: state.board.items.filter(i => i.id !== action.id) },
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        past,
        future: [],
        editCount: state.editCount + 1,
      };
    }

    case 'BRING_FORWARD': {
      if (!state.board) return state;
      const max = maxZIndex(state.board.items);
      return {
        ...state,
        board: {
          ...state.board,
          items: state.board.items.map(i =>
            i.id === action.id ? { ...i, zIndex: max + 1 } : i
          ),
        },
      };
    }

    case 'SEND_BACKWARD': {
      if (!state.board) return state;
      const min = state.board.items.reduce((m, i) => Math.min(m, i.zIndex), Infinity);
      return {
        ...state,
        board: {
          ...state.board,
          items: state.board.items.map(i =>
            i.id === action.id ? { ...i, zIndex: Math.max(0, min - 1) } : i
          ),
        },
      };
    }

    case 'UNDO': {
      if (state.past.length === 0 || !state.board) return state;
      const past = [...state.past];
      const items = past.pop()!;
      return {
        ...state,
        board: { ...state.board, items },
        past,
        future: [state.board.items, ...state.future],
        selectedId: null,
      };
    }

    case 'REDO': {
      if (state.future.length === 0 || !state.board) return state;
      const [items, ...future] = state.future;
      return {
        ...state,
        board: { ...state.board, items },
        past: [...state.past, state.board.items],
        future,
        selectedId: null,
      };
    }

    case 'SHUFFLE_ITEMS': {
      if (!state.board) return state;
      
      const padding = 20;
      let curX = 100;
      let curY = 100;
      let rowHeight = 0;
      const MAX_W = 1200; // arbitrary wrap width

      const newItems = state.board.items.map(item => {
        if (curX + item.width > MAX_W) {
          curX = 100;
          curY += rowHeight + padding;
          rowHeight = 0;
        }
        
        const nextX = curX;
        const nextY = curY;
        
        curX += item.width + padding;
        rowHeight = Math.max(rowHeight, item.height);
        
        return {
          ...item,
          x: nextX,
          y: nextY,
          rotation: (Math.random() * 4 - 2), // slightly messy look
        };
      });

      return {
        ...state,
        board: { ...state.board, items: newItems },
        past: [...state.past, state.board.items],
        future: [],
      };
    }

    default:
      return state;
  }
}

const initialState: CanvasState = {
  board: null,
  selectedId: null,
  tool: 'select',
  flippedId: null,
  imageUrls: {},
  past: [],
  future: [],
  editCount: 0,
};

// ─── Hook ────────────────────────────────────────────────────

export function useCanvas(boardId: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkpointEditCount = useRef(0);

  // ── Load board ──
  useEffect(() => {
    getBoard(boardId).then(board => {
      if (board) {
        dispatch({ type: 'LOAD_BOARD', board });
        // Load image URLs
        for (const item of board.items) {
          if (item.imageId) {
            getImageUrl(item.imageId).then(url => {
              if (url) dispatch({ type: 'SET_IMAGE_URL', imageId: item.imageId!, url });
            });
          }
        }
      }
    });
    return () => {
      revokeImageUrls();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [boardId]);

  // ── Auto-save on change ──
  const { board, editCount } = state;
  useEffect(() => {
    if (!board) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // Save checkpoint every 20 edits
      checkpointEditCount.current += 1;
      const nextBoard = checkpointEditCount.current % 20 === 0
        ? { ...board, checkpoints: [...board.checkpoints, { at: Date.now(), items: board.items }].slice(-50) }
        : board;
      await saveBoard(nextBoard);
    }, 400);
  }, [board, editCount]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          e.preventDefault();
          dispatch({ type: 'DELETE_ITEM', id: state.selectedId });
        }
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT', id: null });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.selectedId]);

  // ── Actions ──

  const selectItem = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT', id });
  }, []);

  const setTool = useCallback((tool: ActiveTool) => {
    dispatch({ type: 'SET_TOOL', tool });
  }, []);

  const flipItem = useCallback((id: string | null) => {
    dispatch({ type: 'SET_FLIPPED', id });
  }, []);

  const setBoardName = useCallback((name: string) => {
    dispatch({ type: 'SET_BOARD_NAME', name });
  }, []);

  const updateBoardMeta = useCallback((updates: Partial<BoardData>) => {
    dispatch({ type: 'UPDATE_BOARD_META', updates });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<CanvasItem>) => {
    dispatch({ type: 'UPDATE_ITEM', id, updates });
  }, []);

  const deleteSelected = useCallback(() => {
    if (state.selectedId) dispatch({ type: 'DELETE_ITEM', id: state.selectedId });
  }, [state.selectedId]);

  const shuffle = useCallback(() => dispatch({ type: 'SHUFFLE_ITEMS' }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const bringForward = useCallback((id: string) => dispatch({ type: 'BRING_FORWARD', id }), []);
  const sendBackward = useCallback((id: string) => dispatch({ type: 'SEND_BACKWARD', id }), []);

  const addImageItem = useCallback(async (file: File, dropX = 200, dropY = 200) => {
    if (!state.board) return;
    const imageId = nanoid();
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    await saveImage(imageId, blob);
    const url = URL.createObjectURL(blob);
    dispatch({ type: 'SET_IMAGE_URL', imageId, url });

    // Compute natural dimensions
    const img = new Image();
    img.src = url;
    await new Promise(r => { img.onload = r; });
    const maxW = 400;
    const scale = Math.min(1, maxW / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const items = state.board.items;
    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: nanoid(), type: 'image', imageId,
        x: dropX, y: dropY,
        width: w, height: h,
        rotation: 0, zIndex: maxZIndex(items) + 1,
        opacity: 1, brightness: 100, contrast: 100, saturate: 100, blur: 0,
      },
    });
  }, [state.board]);

  const addTextItem = useCallback((x = 200, y = 200) => {
    if (!state.board) return;
    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: nanoid(), type: 'text',
        x, y, width: 240, height: 80,
        rotation: 0, zIndex: maxZIndex(state.board.items) + 1,
        text: '텍스트를 입력하세요', textColor: 'var(--ink)', fontSize: 20,
      },
    });
  }, [state.board]);

  const addShapeItem = useCallback((shapeType: ShapeType = 'rect', x = 200, y = 200, style: Partial<CanvasItem> = {}) => {
    if (!state.board) return;
    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: nanoid(), type: 'shape', shapeType,
        x, y, width: 160, height: 160,
        rotation: 0, zIndex: maxZIndex(state.board.items) + 1,
        fillColor: style.fillColor ?? 'var(--riso-yellow)',
        strokeColor: style.strokeColor ?? 'var(--ink)',
        strokeWidth: style.strokeWidth ?? 2,
        strokeDash: style.strokeDash,
        cornerRadius: style.cornerRadius,
        opacity: style.opacity,
      },
    });
  }, [state.board]);

  const addDrawingItem = useCallback((path: string, color: string, width: number) => {
    if (!state.board) return;
    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: nanoid(), type: 'drawing',
        x: 0, y: 0, width: 0, height: 0,
        rotation: 0, zIndex: maxZIndex(state.board.items) + 1,
        drawingPath: path, drawingColor: color, drawingWidth: width,
      },
    });
  }, [state.board]);

  const setImageUrl = useCallback((imageId: string, url: string) => {
    dispatch({ type: 'SET_IMAGE_URL', imageId, url });
  }, []);

  const addRawItem = useCallback((item: CanvasItem) => {
    if (!state.board) return;
    dispatch({
      type: 'ADD_ITEM',
      item: { ...item, zIndex: maxZIndex(state.board.items) + 1 },
    });
  }, [state.board]);

  // ── Computed values ──
  const items = state.board?.items ?? [];
  const totalPrice = items.reduce((s, i) => s + (i.price ?? 0), 0);
  const checklistItems = items.filter(i => i.checked !== undefined);
  const checkedCount = checklistItems.filter(i => i.checked).length;
  const selectedItem = items.find(i => i.id === state.selectedId) ?? null;

  return {
    board: state.board,
    items,
    selectedId: state.selectedId,
    selectedItem,
    tool: state.tool,
    flippedId: state.flippedId,
    imageUrls: state.imageUrls,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    totalPrice,
    checkedCount,
    checklistTotal: checklistItems.length,
    // Actions
    selectItem,
    setTool,
    flipItem,
    setBoardName,
    updateBoardMeta,
    updateItem,
    deleteSelected,
    shuffle,
    undo,
    redo,
    bringForward,
    sendBackward,
    addImageItem,
    addTextItem,
    addShapeItem,
    addDrawingItem,
    setImageUrl,
    addRawItem,
  };
}
