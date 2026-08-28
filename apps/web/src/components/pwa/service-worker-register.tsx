'use client';

import { useEffect } from 'react';

interface ServiceWorkerRegisterProps {
  /**
   * Ativa o registro. Padrão: somente em produção. Em desenvolvimento a etapa é
   * ignorada para não mascarar o cache do Next.js.
   */
  enabled?: boolean;
}

/**
 * Registra o service worker (/sw.js) no carregamento da página.
 */
export function ServiceWorkerRegister({
  enabled = process.env.NODE_ENV === 'production',
}: ServiceWorkerRegisterProps) {
  useEffect(() => {
    if (!enabled) return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((error) => console.warn('Service worker registration failed', error));
    };

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, [enabled]);

  return null;
}