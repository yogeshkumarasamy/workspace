export interface Env {
  DB: D1Database;
  UPLOAD: {
    create(options: { id?: string; params?: { jobId: string } }): Promise<{ id: string }>;
  };
  ENVIRONMENT: string;
  YOUTUBE_MODE: string;
  UPLOAD_CHUNK_BYTES?: string;
  DRIVE_SCOPE?: string;
  CORS_ORIGIN: string;
  APP_PUBLIC_URL: string;
  API_KEY: string;
  ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  DAILY_QUOTA_UNITS?: string;
  GIT_SHA?: string;
}
