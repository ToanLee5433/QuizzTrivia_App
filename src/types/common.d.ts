/**
 * Common type definitions to reduce 'any' usage
 */

// Generic event handler types
export type ChangeEvent<T = HTMLInputElement> = React.ChangeEvent<T>;
export type FormEvent<T = HTMLFormElement> = React.FormEvent<T>;
export type MouseEvent<T = HTMLElement> = React.MouseEvent<T>;
export type KeyboardEvent<T = HTMLElement> = React.KeyboardEvent<T>;

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
  message?: string;
}

// Generic callback types
export type VoidCallback = () => void;
export type AsyncVoidCallback = () => Promise<void>;
export type Callback<T> = (value: T) => void;
export type AsyncCallback<T> = (value: T) => Promise<void>;

// Form field types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched?: boolean;
}

// Generic state types
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

// Sort types
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// Filter types
export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

// Firebase types helpers
export type FirestoreData = Record<string, unknown>;
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
};

// React component props helpers
export interface BaseProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// Modal props
export interface ModalProps extends BaseProps {
  isOpen: boolean;
  onClose: VoidCallback;
  title?: string;
}

// List props
export interface ListProps<T> extends BaseProps {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  emptyMessage?: string;
}

// Safe any alternatives
export type SafeAny = unknown;
export type AnyObject = Record<string, unknown>;
export type AnyArray = unknown[];
export type AnyFunction = (...args: unknown[]) => unknown;
export type AnyAsyncFunction = (...args: unknown[]) => Promise<unknown>;

// Export as namespace for global use
declare global {
  namespace App {
    export type {
      ApiResponse,
      VoidCallback,
      AsyncVoidCallback,
      LoadingState,
      PaginationParams,
      SortParams,
      FilterParams,
      SafeAny,
      AnyObject,
      AnyArray,
      AnyFunction,
      AnyAsyncFunction
    };
  }
}
