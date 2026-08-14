import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    saveAnswerToOfflineQueue,
    getPendingOfflineAnswers,
    removePendingOfflineAnswer,
    clearSessionOfflineQueue,
    syncPendingAnswersToServer,
    subscribeToNetworkStatus,
} from "../offline-sync";

describe("offline-sync utility", () => {
    const sessionId = "session-test-123";
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        vi.restoreAllMocks();

        vi.stubGlobal("localStorage", {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, value: string) => {
                mockStorage[key] = value;
            },
            removeItem: (key: string) => {
                delete mockStorage[key];
            },
            clear: () => {
                mockStorage = {};
            },
        });
    });

    it("should save and retrieve pending answers from local queue", () => {
        saveAnswerToOfflineQueue(sessionId, "q-1", "A");
        saveAnswerToOfflineQueue(sessionId, "q-2", "B");

        const pending = getPendingOfflineAnswers(sessionId);
        expect(pending).toHaveLength(2);
        expect(pending.find((p) => p.questionId === "q-1")?.answer).toBe("A");
        expect(pending.find((p) => p.questionId === "q-2")?.answer).toBe("B");
    });

    it("should remove individual answer from queue after sync", () => {
        saveAnswerToOfflineQueue(sessionId, "q-1", "A");
        saveAnswerToOfflineQueue(sessionId, "q-2", "B");

        removePendingOfflineAnswer(sessionId, "q-1");

        const pending = getPendingOfflineAnswers(sessionId);
        expect(pending).toHaveLength(1);
        expect(pending[0].questionId).toBe("q-2");
    });

    it("should clear all answers for a session", () => {
        saveAnswerToOfflineQueue(sessionId, "q-1", "A");
        saveAnswerToOfflineQueue(sessionId, "q-2", "B");

        clearSessionOfflineQueue(sessionId);
        const pending = getPendingOfflineAnswers(sessionId);
        expect(pending).toHaveLength(0);
    });

    it("should sync pending answers to server", async () => {
        saveAnswerToOfflineQueue(sessionId, "q-1", "A");
        saveAnswerToOfflineQueue(sessionId, "q-2", "B");

        const syncFn = vi.fn().mockImplementation(async (qId: string) => {
            return qId === "q-1"; // q-1 succeeds, q-2 fails
        });

        const result = await syncPendingAnswersToServer(sessionId, syncFn);
        expect(result.synced).toBe(1);
        expect(result.failed).toBe(1);

        const remaining = getPendingOfflineAnswers(sessionId);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].questionId).toBe("q-2");
    });

    it("should subscribe and unsubscribe from network status events", () => {
        const callback = vi.fn();
        const addEventSpy = vi.spyOn(window, "addEventListener");
        const removeEventSpy = vi.spyOn(window, "removeEventListener");

        const unsubscribe = subscribeToNetworkStatus(callback);
        expect(addEventSpy).toHaveBeenCalledWith("online", expect.any(Function));
        expect(addEventSpy).toHaveBeenCalledWith("offline", expect.any(Function));

        unsubscribe();
        expect(removeEventSpy).toHaveBeenCalledWith("online", expect.any(Function));
        expect(removeEventSpy).toHaveBeenCalledWith("offline", expect.any(Function));
    });
});
