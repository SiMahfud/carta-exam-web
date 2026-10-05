import { describe, it, expect, vi } from "vitest";
import {
    proctoringEvents,
    publishViolationEvent,
    publishStudentSubmitEvent,
    publishProctorActionEvent,
    publishStudentStartEvent,
    publishSessionUpdateEvent,
    type ProctoringEvent,
} from "../proctoring-events";

describe("proctoring-events bus", () => {
    it("should allow subscribing to session events and receiving publications", () => {
        const sessionId = "session-test-123";
        const received: ProctoringEvent[] = [];

        const unsubscribe = proctoringEvents.subscribe(sessionId, (event) => {
            received.push(event);
        });

        publishViolationEvent(sessionId, "student-1", "Ahmad", "TAB_SWITCH", 2, "Switched tab");

        expect(received).toHaveLength(1);
        expect(received[0].type).toBe("violation");
        expect(received[0].studentName).toBe("Ahmad");
        expect(received[0].data.violationType).toBe("TAB_SWITCH");
        expect(received[0].data.violationCount).toBe(2);

        unsubscribe();
    });

    it("should not deliver events after unsubscribing", () => {
        const sessionId = "session-test-456";
        const callback = vi.fn();

        const unsubscribe = proctoringEvents.subscribe(sessionId, callback);
        publishStudentSubmitEvent(sessionId, "student-2", "Budi", 85);
        expect(callback).toHaveBeenCalledTimes(1);

        unsubscribe();
        publishStudentSubmitEvent(sessionId, "student-2", "Budi", 90);
        expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should support proctor actions publication", () => {
        const sessionId = "session-test-789";
        const callback = vi.fn();

        const unsubscribe = proctoringEvents.subscribe(sessionId, callback);
        publishProctorActionEvent(sessionId, "admin-1", "reset_violations", "student-3", "Reset violations");

        expect(callback).toHaveBeenCalledTimes(1);
        const event = callback.mock.calls[0][0] as ProctoringEvent;
        expect(event.type).toBe("proctor_action");
        expect(event.data.action).toBe("reset_violations");
        expect(event.studentId).toBe("student-3");

        unsubscribe();
    });

    it("should support student start and session update publications", () => {
        const sessionId = "session-test-start";
        const callback = vi.fn();

        const unsubscribe = proctoringEvents.subscribe(sessionId, callback);
        publishStudentStartEvent(sessionId, "student-4", "Citra");

        expect(callback).toHaveBeenCalledTimes(1);
        const startEvent = callback.mock.calls[0][0] as ProctoringEvent;
        expect(startEvent.type).toBe("student_start");
        expect(startEvent.studentId).toBe("student-4");
        expect(startEvent.studentName).toBe("Citra");

        publishSessionUpdateEvent(sessionId, "reset_violations", { studentIds: ["student-4"] });
        expect(callback).toHaveBeenCalledTimes(2);
        const updateEvent = callback.mock.calls[1][0] as ProctoringEvent;
        expect(updateEvent.type).toBe("session_update");
        expect(updateEvent.data.action).toBe("reset_violations");

        unsubscribe();
    });
});
