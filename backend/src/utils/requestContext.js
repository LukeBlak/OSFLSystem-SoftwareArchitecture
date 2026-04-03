import { AsyncLocalStorage } from 'node:async_hooks';

const requestContextStorage = new AsyncLocalStorage();

export const requestContextMiddleware = (req, res, next) => {
  requestContextStorage.run({ supabase: null }, () => {
    next();
  });
};

export const setRequestSupabaseClient = (client) => {
  const store = requestContextStorage.getStore();
  if (store) {
    store.supabase = client;
  }
};

export const getRequestSupabaseClient = () => {
  const store = requestContextStorage.getStore();
  return store?.supabase || null;
};
