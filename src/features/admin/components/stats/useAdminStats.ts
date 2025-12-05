/**
 * Custom Hook: useAdminStats
 * Manages admin dashboard data fetching with time range support
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getDatabase, ref, onValue } from 'firebase/database';
import { 
  fetchAdminDashboardStats, 
  exportStatsToCSV, 
  exportStatsToJSON,
  AdminDashboardStats,
  TimeRangeType
} from '../../../../services/adminStatsService';

export type TimeRange = TimeRangeType;

export interface OnlineUser {
  odisplayName?: string;
  state: 'online' | 'idle' | 'offline';
  lastChanged: number;
}

export interface UseAdminStatsReturn {
  stats: AdminDashboardStats | null;
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  refreshData: () => Promise<void>;
  exportData: (format: 'csv' | 'json') => void;
  lastUpdated: Date | null;
  onlineCount: number;
  idleCount: number;
}

/**
 * Hook to get real-time online users count from Firebase Realtime Database
 */
export const useOnlineUsers = () => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [idleCount, setIdleCount] = useState(0);

  useEffect(() => {
    const rtdb = getDatabase();
    const statusRef = ref(rtdb, 'status');

    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOnlineCount(0);
        setIdleCount(0);
        return;
      }

      const statuses = snapshot.val() as Record<string, OnlineUser>;
      let online = 0;
      let idle = 0;

      Object.values(statuses).forEach((user) => {
        if (user.state === 'online') {
          online++;
        } else if (user.state === 'idle') {
          idle++;
        }
      });

      setOnlineCount(online);
      setIdleCount(idle);
      console.log('🟢 [AdminStats] Online users:', online, 'Idle:', idle);
    });

    return () => unsubscribe();
  }, []);

  return { onlineCount, idleCount };
};

export const useAdminStats = (): UseAdminStatsReturn => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Track if initial load is done to prevent double fetch
  const initialLoadDone = useRef(false);
  const currentTimeRange = useRef(timeRange);
  
  // Get real-time online users
  const { onlineCount, idleCount } = useOnlineUsers();

  const loadStats = useCallback(async (range: TimeRange, showSuccessToast = false) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📊 [useAdminStats] Loading stats for timeRange: ${range}`);
      const data = await fetchAdminDashboardStats(range);
      setStats(data);
      setLastUpdated(new Date());
      // Only show toast on manual refresh, not on initial load or time range change
      if (showSuccessToast) {
        toast.success(t('admin.dataLoadSuccess', 'Dữ liệu đã được tải thành công!'));
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      const errorMessage = t('admin.realDataLoadError', 'Không thể tải dữ liệu thống kê');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Initial load - only once
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadStats(timeRange);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when timeRange changes (after initial load)
  useEffect(() => {
    if (initialLoadDone.current && currentTimeRange.current !== timeRange) {
      currentTimeRange.current = timeRange;
      loadStats(timeRange);
    }
  }, [timeRange, loadStats]);

  const refreshData = useCallback(async () => {
    await loadStats(timeRange, true); // Show toast on manual refresh
  }, [loadStats, timeRange]);

  const exportData = useCallback((format: 'csv' | 'json') => {
    if (!stats) {
      toast.warning(t('admin.noDataToExport', 'Không có dữ liệu để xuất'));
      return;
    }
    
    try {
      const data = format === 'csv' ? exportStatsToCSV(stats) : exportStatsToJSON(stats);
      const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-stats-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(t('admin.exportSuccess', 'Xuất dữ liệu thành công!'));
    } catch (err) {
      console.error('Export error:', err);
      toast.error(t('admin.exportError', 'Không thể xuất dữ liệu'));
    }
  }, [stats, t]);

  return useMemo(() => ({
    stats,
    loading,
    error,
    timeRange,
    setTimeRange,
    refreshData,
    exportData,
    lastUpdated,
    onlineCount,
    idleCount
  }), [stats, loading, error, timeRange, refreshData, exportData, lastUpdated, onlineCount, idleCount]);
};

export default useAdminStats;
