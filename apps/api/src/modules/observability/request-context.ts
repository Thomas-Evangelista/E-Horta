import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  ip?: string;
  method?: string;
  url?: string;
}

export const requestContextAsyncStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(data: RequestContext, fn: () => T): T {
  return requestContextAsyncStorage.run(data, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextAsyncStorage.getStore();
}
