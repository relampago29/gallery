'use client';

import {useEffect, useRef, useState} from 'react';

export function useInView<T extends HTMLElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current || inView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 50px 0px',
        threshold: 0.1,
        ...options,
      }
    );

    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [inView, options]);

  return {ref, inView};
}
