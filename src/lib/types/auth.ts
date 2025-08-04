// AuthUser type stub for build
export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: 'admin' | 'creator' | 'user';
  [key: string]: any;
}
