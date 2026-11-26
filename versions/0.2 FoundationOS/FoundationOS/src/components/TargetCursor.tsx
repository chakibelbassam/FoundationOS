import { useEffect, useRef, useState } from 'react';

interface Rect { left: number; top: number; width: number; height: number; }

const INTERACTIVE = 'a[href],button,input,textarea,select,[role="menuitem"],[role="button"],[role="link"],[data-target]';

function isFinePointer() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(pointer: fine)').matches;
}

function resolveTarget(node: Element | null): Element | null {
  if (!node) return null;
  const locked = node.closest('[data-target-lock="true"]');
  if (locked && locked !== node) {
    const lockTarget = locked.closest('[data-target]');
    if (lockTarget) return lockTarget;
  }
  const match = node.closest(INTERACTIVE);
  if (!match) return null;
  if (match.closest('[data-target="none"]')) return null;
  if (match.closest('[aria-hidden="true"]')) return null;
  return match;
}

export function TargetCursor({ enabled, reducedMotion }: { enabled: boolean; reducedMotion: boolean }) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const current = useRef<Element | null>(null);
  const lastInput = useRef<'pointer' | 'key'>('pointer');
  const fine = useRef(true);

  useEffect(() => {
    fine.current = isFinePointer();
    if (!enabled || !fine.current) {
      setVisible(false);
      return;
    }

    let frame = 0;

    const measure = () => {
      frame = 0;
      const target = current.current;
      if (!target || !target.isConnected) {
        setVisible(false);
        return;
      }
      const bounds = target.getBoundingClientRect();
      if (bounds.width < 2 || bounds.height < 2) {
        setVisible(false);
        return;
      }
      setRect({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height });
      setVisible(true);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        setVisible(false);
        return;
      }
      lastInput.current = 'pointer';
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = resolveTarget(element);
      if (target !== current.current) {
        current.current = target;
        schedule();
      } else if (target) {
        schedule();
      }
    };

    const onPointerLeave = () => {
      current.current = null;
      setVisible(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
        lastInput.current = 'key';
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (lastInput.current !== 'key') return;
      const target = resolveTarget(event.target as Element | null);
      current.current = target;
      schedule();
    };

    const onScroll = () => schedule();
    const onResize = () => schedule();

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    const timer = window.setInterval(() => {
      if (lastInput.current === 'key') {
        current.current = resolveTarget(document.activeElement);
        schedule();
      } else if (current.current) {
        schedule();
      }
    }, 160);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="fo-target"
      data-visible={visible && Boolean(rect)}
      data-reduced={reducedMotion}
      aria-hidden="true"
      style={
        rect
          ? {
              left: `${rect.left - 4}px`,
              top: `${rect.top - 4}px`,
              width: `${rect.width + 8}px`,
              height: `${rect.height + 8}px`,
              transitionDuration: reducedMotion ? '0ms' : undefined,
            }
          : undefined
      }
    >
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
