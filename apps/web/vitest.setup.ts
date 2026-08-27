import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { createElement, forwardRef, Fragment } from 'react';
import type { ComponentType, ReactNode } from 'react';

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);

// framer-motion em jsdom não anima de forma determinística; renderiza direto.
vi.mock('framer-motion', async () => {
  const cache = new Map<string, ComponentType<Record<string, unknown>>>();
  const MOTION_PROPS = [
    'whileTap',
    'whileHover',
    'whileFocus',
    'whileDrag',
    'initial',
    'animate',
    'exit',
    'transition',
    'layout',
    'layoutId',
    'variants',
  ] as const;

  const motion = new Proxy({} as Record<string, ComponentType<Record<string, unknown>>>, {
    get: (_target, tag) => {
      const name = String(tag);
      let Comp = cache.get(name);
      if (!Comp) {
        const C = forwardRef<HTMLElement, Record<string, unknown>>(
          ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>, ref) => {
            const domProps: Record<string, unknown> = { ...props };
            for (const key of MOTION_PROPS) delete domProps[key];
            return createElement(name, { ref, ...domProps }, children as ReactNode);
          },
        );
        C.displayName = `motion.${name}`;
        Comp = C as unknown as ComponentType<Record<string, unknown>>;
        cache.set(name, Comp);
      }
      return Comp;
    },
  });

  return {
    AnimatePresence: ({ children }: { children?: ReactNode }) =>
      createElement(Fragment, null, children),
    MotionConfig: ({ children }: { children?: ReactNode }) =>
      createElement(Fragment, null, children),
    motion,
    useReducedMotion: () => false,
    useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  };
});