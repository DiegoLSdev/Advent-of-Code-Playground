import { useEffect, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

interface Props {
  /** vertical: drag left/right · horizontal: drag up/down. */
  orientation: 'vertical' | 'horizontal';
  containerRef: RefObject<HTMLElement | null>;
  value: number;
  onChange: (ratio: number) => void;
  onDoubleClick?: () => void;
  label: string;
}

/** Draggable divider; reports the new size as a 0–1 ratio of the container. */
export function Splitter({ orientation, containerRef, value, onChange, onDoubleClick, label }: Props) {
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const container = containerRef.current;
    if (!container || e.button !== 0) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    document.body.classList.add(`resizing-${orientation}`);

    // Listen on window: the handle may re-render or move while dragging,
    // and the drag must always end when the button is released.
    const move = (ev: globalThis.PointerEvent) => {
      onChange(orientation === 'vertical' ? (ev.clientX - rect.left) / rect.width : (ev.clientY - rect.top) / rect.height);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
      document.body.classList.remove(`resizing-${orientation}`);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
  }

  // Never leave the page stuck in resize mode if the splitter unmounts mid-drag.
  useEffect(() => () => document.body.classList.remove(`resizing-${orientation}`), [orientation]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const back = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp';
    const forward = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown';
    if (e.key === back || e.key === forward) {
      e.preventDefault();
      onChange(value + (e.key === forward ? 0.05 : -0.05));
    }
  }

  return (
    <div
      className={`splitter ${orientation}`}
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      title={`${label} · double-click to toggle`}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    />
  );
}
