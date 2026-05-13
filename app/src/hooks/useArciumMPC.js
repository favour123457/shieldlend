/**
 * useArciumMPC — React hook for tracking Arcium MPC computation state.
 *
 * Provides status, elapsed time, timeout detection, and
 * a clean abstraction for the async MPC computation lifecycle.
 */

import { useState, useCallback, useRef } from "react";
import { MPC_TIMEOUT_WARN_MS } from "../lib/constants";

export const MPC_STATUS = {
  IDLE: "idle",
  ENCRYPTING: "encrypting",
  QUEUED: "queued",
  COMPUTING: "computing",
  DONE: "done",
  ERROR: "error",
  TIMEOUT_WARNING: "timeout_warning",
};

export function useArciumMPC() {
  const [status, setStatus] = useState(MPC_STATUS.IDLE);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const warnTimerRef = useRef(null);

  // Start elapsed time counter
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    warnTimerRef.current = setTimeout(() => {
      setStatus(MPC_STATUS.TIMEOUT_WARNING);
    }, MPC_TIMEOUT_WARN_MS);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    setStatus(MPC_STATUS.IDLE);
    setElapsed(0);
    setError(null);
    setResult(null);
    startTimeRef.current = null;
  }, [stopTimer]);

  /**
   * Run an MPC computation with status tracking.
   *
   * @param {function} fn - async function that performs the MPC call
   * @returns {Promise<any>} result of fn
   */
  const runComputation = useCallback(
    async (fn) => {
      reset();
      setError(null);

      try {
        setStatus(MPC_STATUS.ENCRYPTING);
        await new Promise((r) => setTimeout(r, 50)); // Allow React to re-render

        setStatus(MPC_STATUS.QUEUED);
        startTimer();

        setStatus(MPC_STATUS.COMPUTING);

        const computationResult = await fn({
          onQueued: () => setStatus(MPC_STATUS.QUEUED),
          onComputing: () => setStatus(MPC_STATUS.COMPUTING),
        });

        stopTimer();
        setStatus(MPC_STATUS.DONE);
        setResult(computationResult);
        return computationResult;
      } catch (err) {
        stopTimer();
        setStatus(MPC_STATUS.ERROR);
        setError(err.message || "MPC computation failed");
        throw err;
      }
    },
    [reset, startTimer, stopTimer]
  );

  return {
    status,
    elapsed,
    error,
    result,
    isIdle: status === MPC_STATUS.IDLE,
    isRunning:
      status === MPC_STATUS.ENCRYPTING ||
      status === MPC_STATUS.QUEUED ||
      status === MPC_STATUS.COMPUTING ||
      status === MPC_STATUS.TIMEOUT_WARNING,
    isDone: status === MPC_STATUS.DONE,
    isError: status === MPC_STATUS.ERROR,
    isTimedOut: status === MPC_STATUS.TIMEOUT_WARNING,
    runComputation,
    reset,
    setStatus,
  };
}
