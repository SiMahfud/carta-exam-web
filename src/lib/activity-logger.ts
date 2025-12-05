import { db } from "@/lib/db";
import { activityLogs } from "@/lib/schema";

interface LogActivityParams {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
}

/**
 * Log an activity to the activity_logs table
 * @param params - Activity log parameters
 * @returns Promise<void>
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
    try {
        await db.insert(activityLogs).values({
            userId: params.userId || null,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId || null,
            details: params.details || null,
        });
    } catch (error) {
        // Log error but don't throw - we don't want activity logging to break the main flow
        console.error("Failed to log activity:", error);
    }
}

/**
 * Helper functions for common activity types
 */
export const ActivityLogger = {
    examSession: {
        created: (userId: string, sessionId: string, sessionName: string) =>
            logActivity({
                userId,
                action: "created",
                entityType: "exam_session",
                entityId: sessionId,
                details: { sessionName },
            }),
        updated: (userId: string, sessionId: string, sessionName: string) =>
            logActivity({
                userId,
                action: "updated",
                entityType: "exam_session",
                entityId: sessionId,
                details: { sessionName },
            }),
        deleted: (userId: string, sessionId: string, sessionName: string) =>
            logActivity({
                userId,
                action: "deleted",
                entityType: "exam_session",
                entityId: sessionId,
                details: { sessionName },
            }),
        started: (userId: string, sessionId: string, sessionName: string) =>
            logActivity({
                userId,
                action: "started",
                entityType: "exam_session",
                entityId: sessionId,
                details: { sessionName },
            }),
    },
    examTemplate: {
        created: (userId: string, templateId: string, templateName: string) =>
            logActivity({
                userId,
                action: "created",
                entityType: "exam_template",
                entityId: templateId,
                details: { templateName },
            }),
        updated: (userId: string, templateId: string, templateName: string) =>
            logActivity({
                userId,
                action: "updated",
                entityType: "exam_template",
                entityId: templateId,
                details: { templateName },
            }),
        deleted: (userId: string, templateId: string, templateName: string) =>
            logActivity({
                userId,
                action: "deleted",
                entityType: "exam_template",
                entityId: templateId,
                details: { templateName },
            }),
    },
    questionBank: {
        created: (userId: string, bankId: string, bankName: string) =>
            logActivity({
                userId,
                action: "created",
                entityType: "question_bank",
                entityId: bankId,
                details: { bankName },
            }),
        updated: (userId: string, bankId: string, bankName: string) =>
            logActivity({
                userId,
                action: "updated",
                entityType: "question_bank",
                entityId: bankId,
                details: { bankName },
            }),
        deleted: (userId: string, bankId: string, bankName: string) =>
            logActivity({
                userId,
                action: "deleted",
                entityType: "question_bank",
                entityId: bankId,
                details: { bankName },
            }),
    },
    subject: {
        created: (userId: string, subjectId: string, subjectName: string) =>
            logActivity({
                userId,
                action: "created",
                entityType: "subject",
                entityId: subjectId,
                details: { subjectName },
            }),
        updated: (userId: string, subjectId: string, subjectName: string) =>
            logActivity({
                userId,
                action: "updated",
                entityType: "subject",
                entityId: subjectId,
                details: { subjectName },
            }),
        deleted: (userId: string, subjectId: string, subjectName: string) =>
            logActivity({
                userId,
                action: "deleted",
                entityType: "subject",
                entityId: subjectId,
                details: { subjectName },
            }),
    },
    class: {
        created: (userId: string, classId: string, className: string) =>
            logActivity({
                userId,
                action: "created",
                entityType: "class",
                entityId: classId,
                details: { className },
            }),
        updated: (userId: string, classId: string, className: string) =>
            logActivity({
                userId,
                action: "updated",
                entityType: "class",
                entityId: classId,
                details: { className },
            }),
        deleted: (userId: string, classId: string, className: string) =>
            logActivity({
                userId,
                action: "deleted",
                entityType: "class",
                entityId: classId,
                details: { className },
            }),
    },
    user: {
        created: (userId: string, targetUserId: string, userName: string, role: string) =>
            logActivity({
                userId,
                action: "created",
                entityType: "user",
                entityId: targetUserId,
                details: { userName, role },
            }),
        updated: (userId: string, targetUserId: string, userName: string) =>
            logActivity({
                userId,
                action: "updated",
                entityType: "user",
                entityId: targetUserId,
                details: { userName },
            }),
        deleted: (userId: string, targetUserId: string, userName: string) =>
            logActivity({
                userId,
                action: "deleted",
                entityType: "user",
                entityId: targetUserId,
                details: { userName },
            }),
    },
};
