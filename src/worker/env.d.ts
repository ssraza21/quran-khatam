declare interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}
