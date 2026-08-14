/**
 * Proctoring Events - In-memory Event Bus for SSE
 * 
 * Publishes and subscribes to real-time proctoring events per exam session.
 * Used to stream violations, status updates, and proctor actions to admin dashboard.
 */

export type ProctoringEventType =
    | 'violation'
    | 'student_start'
    | 'student_submit'
    | 'student_heartbeat'
    | 'proctor_action'
    | 'session_update'

export interface ProctoringEvent {
    type: ProctoringEventType
    sessionId: string
    studentId?: string
    studentName?: string
    data: Record<string, unknown>
    timestamp: string
}

type EventCallback = (event: ProctoringEvent) => void

/**
 * Simple in-memory event bus for SSE proctoring events.
 * Each session has its own set of subscribers (admin/teacher connections).
 */
class ProctoringEventBus {
    private subscribers: Map<string, Set<EventCallback>> = new Map()

    /**
     * Subscribe to events for a specific exam session
     * @returns Unsubscribe function
     */
    subscribe(sessionId: string, callback: EventCallback): () => void {
        if (!this.subscribers.has(sessionId)) {
            this.subscribers.set(sessionId, new Set())
        }
        this.subscribers.get(sessionId)!.add(callback)

        return () => {
            const subs = this.subscribers.get(sessionId)
            if (subs) {
                subs.delete(callback)
                if (subs.size === 0) {
                    this.subscribers.delete(sessionId)
                }
            }
        }
    }

    /**
     * Publish an event to all subscribers of a session
     */
    publish(event: ProctoringEvent): void {
        const subs = this.subscribers.get(event.sessionId)
        if (subs) {
            subs.forEach((callback) => {
                try {
                    callback(event)
                } catch (error) {
                    console.error('[ProctoringEvents] Error in subscriber callback:', error)
                }
            })
        }
    }

    /**
     * Get number of active subscribers for a session
     */
    getSubscriberCount(sessionId: string): number {
        return this.subscribers.get(sessionId)?.size || 0
    }

    /**
     * Clean up all subscribers for a session
     */
    cleanup(sessionId: string): void {
        this.subscribers.delete(sessionId)
    }
}

// Singleton instance
export const proctoringEvents = new ProctoringEventBus()

// Helper functions for common event types

export function publishViolationEvent(
    sessionId: string,
    studentId: string,
    studentName: string,
    violationType: string,
    violationCount: number,
    details?: string
): void {
    proctoringEvents.publish({
        type: 'violation',
        sessionId,
        studentId,
        studentName,
        data: {
            violationType,
            violationCount,
            details,
        },
        timestamp: new Date().toISOString(),
    })
}

export function publishStudentSubmitEvent(
    sessionId: string,
    studentId: string,
    studentName: string,
    score?: number
): void {
    proctoringEvents.publish({
        type: 'student_submit',
        sessionId,
        studentId,
        studentName,
        data: { score },
        timestamp: new Date().toISOString(),
    })
}

export function publishProctorActionEvent(
    sessionId: string,
    proctorId: string,
    action: string,
    targetStudentId: string,
    message?: string
): void {
    proctoringEvents.publish({
        type: 'proctor_action',
        sessionId,
        studentId: targetStudentId,
        data: {
            proctorId,
            action,
            message,
        },
        timestamp: new Date().toISOString(),
    })
}

export function publishHeartbeatEvent(
    sessionId: string,
    studentId: string,
    remainingSeconds: number
): void {
    proctoringEvents.publish({
        type: 'student_heartbeat',
        sessionId,
        studentId,
        data: { remainingSeconds },
        timestamp: new Date().toISOString(),
    })
}
