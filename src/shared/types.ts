export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: UserRole; // Make role optional để user có thể chọn sau
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  stats: UserStats;
}

export type UserRole = 'user' | 'creator' | 'admin';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  quizReminders: boolean;
  newQuizzes: boolean;
}

export interface UserStats {
  totalQuizzesTaken: number;
  totalQuizzesCreated: number;
  averageScore: number;
  totalTimeSpent: number; // in minutes
  favoriteCategories: string[];
  streak: number; // consecutive days
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

export interface UserProfile {
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: SocialLinks;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
}
