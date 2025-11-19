import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  pageLoadTime?: number;
  answerSubmissionLatency?: number;
  leaderboardUpdateLatency?: number;
  questionTransitionTime?: number;
  sessionDuration?: number;
}

/**
 * Hook to monitor multiplayer performance metrics
 * Tracks page load, answer submission latency, and session duration
 */
export function usePerformanceMonitoring(roomId: string, userId: string) {
  const metricsRef = useRef<PerformanceMetrics>({});
  const sessionStartTime = useRef<number>(performance.now());
  const lastOperationTime = useRef<number>(0);

  // Track page load time
  useEffect(() => {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;

      if (loadTime > 0) {
        metricsRef.current.pageLoadTime = loadTime;

        logger.info('Multiplayer page loaded', {
          roomId,
          userId,
          loadTime,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          firstPaint: timing.responseStart - timing.navigationStart,
        });

        // Log to analytics
        if (window.gtag) {
          window.gtag('event', 'multiplayer_load_time', {
            event_category: 'Performance',
            event_label: roomId,
            value: loadTime,
          });
        }

        // Warn if load time is too high
        if (loadTime > 3000) {
          logger.warn('Slow page load detected', {
            roomId,
            userId,
            loadTime,
          });
        }
      }
    }
  }, [roomId, userId]);

  // Track answer submission latency
  const trackAnswerSubmission = useCallback(
    async (operation: () => Promise<any>) => {
      const startTime = performance.now();
      lastOperationTime.current = startTime;

      try {
        const result = await operation();
        const latency = performance.now() - startTime;

        metricsRef.current.answerSubmissionLatency = latency;

        logger.info('Answer submitted', {
          roomId,
          userId,
          latency: Math.round(latency),
        });

        // Log to analytics
        if (window.gtag) {
          window.gtag('event', 'answer_submit_latency', {
            event_category: 'Performance',
            event_label: roomId,
            value: Math.round(latency),
          });
        }

        // Warn if latency is too high
        if (latency > 1000) {
          logger.warn('High answer submission latency', {
            roomId,
            userId,
            latency: Math.round(latency),
          });

          // Send to error tracking (Sentry)
          if (window.Sentry) {
            window.Sentry.captureMessage('High answer submission latency', {
              level: 'warning',
              extra: {
                roomId,
                userId,
                latency,
              },
            });
          }
        }

        return result;
      } catch (error) {
        const latency = performance.now() - startTime;

        logger.error('Answer submission failed', {
          roomId,
          userId,
          latency: Math.round(latency),
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    },
    [roomId, userId]
  );

  // Track leaderboard update latency
  const trackLeaderboardUpdate = useCallback(
    async (operation: () => Promise<any>) => {
      const startTime = performance.now();

      try {
        const result = await operation();
        const latency = performance.now() - startTime;

        metricsRef.current.leaderboardUpdateLatency = latency;

        logger.debug('Leaderboard updated', {
          roomId,
          userId,
          latency: Math.round(latency),
        });

        // Warn if latency is too high
        if (latency > 500) {
          logger.warn('High leaderboard update latency', {
            roomId,
            userId,
            latency: Math.round(latency),
          });
        }

        return result;
      } catch (error) {
        logger.error('Leaderboard update failed', {
          roomId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    },
    [roomId, userId]
  );

  // Track question transition time
  const trackQuestionTransition = useCallback(() => {
    const now = performance.now();
    const transitionTime = lastOperationTime.current
      ? now - lastOperationTime.current
      : 0;

    if (transitionTime > 0) {
      metricsRef.current.questionTransitionTime = transitionTime;

      logger.debug('Question transition', {
        roomId,
        userId,
        transitionTime: Math.round(transitionTime),
      });
    }

    lastOperationTime.current = now;
  }, [roomId, userId]);

  // Track session duration on unmount
  useEffect(() => {
    return () => {
      const sessionDuration = (performance.now() - sessionStartTime.current) / 1000;
      metricsRef.current.sessionDuration = sessionDuration;

      logger.info('Multiplayer session ended', {
        roomId,
        userId,
        sessionDuration: Math.round(sessionDuration),
        metrics: metricsRef.current,
      });

      // Log to analytics
      if (window.gtag) {
        window.gtag('event', 'multiplayer_session_duration', {
          event_category: 'Engagement',
          event_label: roomId,
          value: Math.round(sessionDuration),
        });
      }
    };
  }, [roomId, userId]);

  // Monitor Core Web Vitals
  useEffect(() => {
    if (!window.PerformanceObserver) return;

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      logger.debug('LCP measured', {
        roomId,
        lcp: Math.round(lastEntry.renderTime || lastEntry.loadTime),
      });
    });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        logger.debug('FID measured', {
          roomId,
          fid: Math.round(entry.processingStart - entry.startTime),
        });
      });
    });

    // Cumulative Layout Shift (CLS)
    let clsScore = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      });

      logger.debug('CLS measured', {
        roomId,
        cls: clsScore.toFixed(3),
      });
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      fidObserver.observe({ type: 'first-input', buffered: true });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      // Silently fail if browser doesn't support these metrics
      logger.debug('Performance observer not fully supported', { error });
    }

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [roomId]);

  return {
    metrics: metricsRef.current,
    trackAnswerSubmission,
    trackLeaderboardUpdate,
    trackQuestionTransition,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    Sentry?: {
      captureMessage: (message: string, options?: any) => void;
      captureException: (error: Error, options?: any) => void;
    };
    PerformanceObserver?: any;
  }
}
