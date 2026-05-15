import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createSupabaseUnavailableError() {
  return new Error("Cliente Supabase desativado: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de publicar em produção.");
}

function createDisabledQuery() {
  const result = { data: null, error: createSupabaseUnavailableError(), ignoredColumns: [] };
  const query = new Proxy({}, {
    get(_target, property) {
      if (property === "then") return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
      if (property === "catch") return (reject) => Promise.resolve(result).catch(reject);
      if (property === "finally") return (callback) => Promise.resolve(result).finally(callback);
      return () => query;
    },
  });
  return query;
}

function createDisabledChannel() {
  return {
    on() {
      return createDisabledChannel();
    },
    subscribe(callback) {
      if (typeof callback === "function") callback("CLOSED");
      return createDisabledChannel();
    },
    unsubscribe() {
      return Promise.resolve("ok");
    },
  };
}

function createDisabledSupabaseClient() {
  return {
    from() {
      return createDisabledQuery();
    },
    rpc() {
      return createDisabledQuery();
    },
    channel() {
      return createDisabledChannel();
    },
    removeChannel() {
      return Promise.resolve("ok");
    },
    storage: {
      from() {
        return createDisabledQuery();
      },
    },
  };
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createDisabledSupabaseClient();
