/**
 * Offline Sync and Resilience utility for CartaExam student runtime.
 * Manages local answer caching and automatic background synchronization
 * if the student loses Wi-Fi connection during an examination.
 */

const STORAGE_PREFIX = "carta_offline_answers_";

export interface PendingAnswer {
    sessionId: string;
    questionId: string;
    answer: unknown;
    timestamp: number;
}

/**
 * Save an answer to the local offline queue in localStorage.
 */
export function saveAnswerToOfflineQueue(
    sessionId: string,
    questionId: string,
    answer: unknown
): void {
    if (typeof window === "undefined") return;

    try {
        const key = `${STORAGE_PREFIX}${sessionId}`;
        const existingRaw = localStorage.getItem(key);
        const queue: Record<string, PendingAnswer> = existingRaw ? JSON.parse(existingRaw) : {};

        queue[questionId] = {
            sessionId,
            questionId,
            answer,
            timestamp: Date.now(),
        };

        localStorage.setItem(key, JSON.stringify(queue));
    } catch (err) {
        console.warn("Failed to store answer in offline queue:", err);
    }
}

/**
 * Retrieve all pending offline answers for a session.
 */
export function getPendingOfflineAnswers(sessionId: string): PendingAnswer[] {
    if (typeof window === "undefined") return [];

    try {
        const key = `${STORAGE_PREFIX}${sessionId}`;
        const existingRaw = localStorage.getItem(key);
        if (!existingRaw) return [];

        const queue: Record<string, PendingAnswer> = JSON.parse(existingRaw);
        return Object.values(queue);
    } catch {
        return [];
    }
}

/**
 * Remove a successfully synced answer from the offline queue.
 */
export function removePendingOfflineAnswer(
    sessionId: string,
    questionId: string
): void {
    if (typeof window === "undefined") return;

    try {
        const key = `${STORAGE_PREFIX}${sessionId}`;
        const existingRaw = localStorage.getItem(key);
        if (!existingRaw) return;

        const queue: Record<string, PendingAnswer> = JSON.parse(existingRaw);
        delete queue[questionId];

        if (Object.keys(queue).length === 0) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(queue));
        }
    } catch (err) {
        console.warn("Failed to delete item from offline queue:", err);
    }
}

/**
 * Clear all offline answers for a session (e.g. after successful final submission).
 */
export function clearSessionOfflineQueue(sessionId: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
    } catch (err) {
        console.warn("Failed to clear offline queue:", err);
    }
}

/**
 * Sync all pending answers to server.
 */
export async function syncPendingAnswersToServer(
    sessionId: string,
    syncFn: (questionId: string, answer: unknown) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
    const pending = getPendingOfflineAnswers(sessionId);
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
        try {
            const success = await syncFn(item.questionId, item.answer);
            if (success) {
                removePendingOfflineAnswer(sessionId, item.questionId);
                synced++;
            } else {
                failed++;
            }
        } catch {
            failed++;
        }
    }

    return { synced, failed };
}

/**
 * Subscribes to browser online/offline network events.
 * Returns an unsubscription function.
 */
export function subscribeToNetworkStatus(
    onStatusChange: (isOnline: boolean) => void
): () => void {
    if (typeof window === "undefined") return () => {};

    const handleOnline = () => onStatusChange(true);
    const handleOffline = () => onStatusChange(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
    };
}
