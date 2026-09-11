import { useEffect, useState, type RefObject } from 'react';

/** Observe real visibility, including CSS-hidden mobile tabs, scroll and background pages. */
export function useMapVisibility(ref: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let intersects = true;
    const update = () => {
      const box = element.getBoundingClientRect();
      setVisible(document.visibilityState === 'visible' && intersects && box.width > 0 && box.height > 0);
    };
    const intersection = new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; update(); });
    const resize = new ResizeObserver(update);
    intersection.observe(element);
    resize.observe(element);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      intersection.disconnect(); resize.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [ref]);
  return visible;
}
