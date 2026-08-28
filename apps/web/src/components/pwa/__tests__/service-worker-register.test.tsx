import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegister } from '../service-worker-register';

function mockServiceWorker() {
  const register = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  });
  return register;
}

afterEach(() => {
  vi.unstubAllGlobals();
  if ('serviceWorker' in navigator) {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  }
});

describe('ServiceWorkerRegister', () => {
  it('não registra quando desabilitado (dev)', () => {
    mockServiceWorker();
    render(<ServiceWorkerRegister enabled={false} />);

    act(() => {
      window.dispatchEvent(new Event('load'));
    });

    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  it('registra o service worker no load quando habilitado', () => {
    const register = mockServiceWorker();
    render(<ServiceWorkerRegister enabled />);

    act(() => {
      window.dispatchEvent(new Event('load'));
    });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('não tenta registrar quando o navegador não suporta service worker', () => {
    render(<ServiceWorkerRegister enabled />);

    act(() => {
      window.dispatchEvent(new Event('load'));
    });
  });
});