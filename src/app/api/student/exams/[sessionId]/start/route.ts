import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, submissions, bankQuestions, studentClearances, administrativeTokens } from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";
import { applyQuestionRandomization, RandomizationRules } from "@/lib/randomization";
import { requireAuth } from "@/lib/auth-guard";
import { validateBrowserRequirements } from "@/lib/browser-detection";
import { publishStudentStartEvent, publishViolationEvent } from "@/lib/proctoring-events";

// POST /api/student/exams/[sessionId]/start - Start taking an exam
export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const user = await requireAuth(["student", "admin", "teacher"]);
        const body = await request.json();
        const { token, adminToken: bodyAdminToken, deviceId: bodyDeviceId } = body;
        const deviceId = bodyDeviceId || request.headers.get("X-Device-Id") || null;

        // For student role, always use authenticated user ID
        const studentId = user.role === "student" ? user.id : (body.studentId || user.id);

        if (!studentId) {
            return NextResponse.json(
                { error: "Student ID required" },
                { status: 400 }
            );
        }

        // Check if already has submission
        const existingSubmission = await db.select()
            .from(submissions)
            .where(and(
                eq(submissions.sessionId, params.sessionId),
                eq(submissions.userId, studentId)
            ))
            .limit(1);

        if (existingSubmission.length > 0) {
            const sub = existingSubmission[0];
            if (sub.status === "terminated") {
                let terminateMessage = "Akses ujian Anda telah dikunci atau dihentikan. Silakan hubungi pengawas di ruangan.";
                try {
                    let log = sub.violationLog;
                    if (typeof log === "string") {
                        try { log = JSON.parse(log); } catch { }
                    }
                    if (Array.isArray(log) && log.length > 0) {
                        const lastLog = log[log.length - 1];
                        if (lastLog?.details) {
                            terminateMessage = lastLog.details;
                        }
                    }
                } catch { }

                return NextResponse.json(
                    {
                        error: "LATE_ENTRY",
                        terminated: true,
                        lateBlocked: true,
                        message: terminateMessage
                    },
                    { status: 403 }
                );
            }

            return NextResponse.json(
                { error: "Exam already started" },
                { status: 400 }
            );
        }

        // Get session and template details
        const sessionData = await db.select({
            templateId: examSessions.templateId,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            status: examSessions.status,
            accessToken: examSessions.accessToken,
        })
            .from(examSessions)
            .where(eq(examSessions.id, params.sessionId))
            .limit(1);

        if (sessionData.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        const session = sessionData[0];

        // Check if session is active
        const now = new Date();
        if (now < new Date(session.startTime) || now > new Date(session.endTime)) {
            return NextResponse.json(
                { error: "Exam is not currently active" },
                { status: 400 }
            );
        }

        // Get template configuration
        const templateData = await db.select()
            .from(examTemplates)
            .where(eq(examTemplates.id, session.templateId))
            .limit(1);

        if (templateData.length === 0) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        const template = templateData[0];

        // Parse violationSettings
        let violationSettings: any = {};
        try {
            if (typeof template.violationSettings === 'string') {
                violationSettings = JSON.parse(template.violationSettings);
            } else if (template.violationSettings && typeof template.violationSettings === 'object') {
                violationSettings = template.violationSettings;
            }
        } catch { violationSettings = {}; }

        // Browser validation (SEB / Exambro)
        const browserError = validateBrowserRequirements(request.headers, {
            requireSeb: violationSettings.requireSeb,
            requireExambro: violationSettings.requireExambro,
        });

        if (browserError) {
            return NextResponse.json(
                { error: browserError, browserBlocked: true },
                { status: 403 }
            );
        }

        // Administrative Clearance Verification
        // If student is administratively locked or dispensation expired, require an administrative dispensation token
        const [studentClearance] = await (db as any)
            .select()
            .from(studentClearances)
            .where(eq(studentClearances.studentId, studentId))
            .limit(1);

        const isClearanceBlocked = studentClearance && (
            studentClearance.status === "locked" ||
            (studentClearance.status === "dispensation" && studentClearance.validUntil && new Date(studentClearance.validUntil) < now)
        );

        if (isClearanceBlocked) {
            const adminToken = bodyAdminToken ? String(bodyAdminToken).trim().toUpperCase() : null;

            if (!adminToken) {
                return NextResponse.json(
                    {
                        error: "Akses ujian Anda memerlukan verifikasi administrasi sekolah. Silakan hubungi bagian Tata Usaha / Petugas Administrasi.",
                        requireAdminToken: true,
                        adminNotes: studentClearance.notes || "Silakan temui petugas Tata Usaha untuk mendapatkan Token Dispensasi.",
                    },
                    { status: 403 }
                );
            }

            // Verify admin token
            const [validAdminToken] = await (db as any)
                .select()
                .from(administrativeTokens)
                .where(and(
                    eq(administrativeTokens.token, adminToken),
                    eq(administrativeTokens.isUsed, false)
                ))
                .limit(1);

            const isTokenExpired = validAdminToken && new Date(validAdminToken.expiresAt) < now;
            const isWrongStudent = validAdminToken && validAdminToken.studentId && validAdminToken.studentId !== studentId;

            if (!validAdminToken || isTokenExpired || isWrongStudent) {
                return NextResponse.json(
                    {
                        error: "Token administrasi tidak valid atau sudah kadaluarsa. Silakan periksa kembali token dari bagian Tata Usaha.",
                        requireAdminToken: true,
                    },
                    { status: 403 }
                );
            }

            // Mark admin token as used
            await (db as any)
                .update(administrativeTokens)
                .set({
                    isUsed: true,
                    usedAt: now,
                })
                .where(eq(administrativeTokens.id, validAdminToken.id));

            // Determine dispensation validity based on token scope:
            // - session: only valid for this session (status remains locked for next sessions)
            // - daily: valid until 23:59:59 tonight
            // - weekly: valid for next 7 days
            // - permanent: valid indefinitely
            const tokenScope = validAdminToken.scope || "daily";
            let newStatus = "dispensation";
            let validUntilDate: Date | null = null;
            let noteText = `Dispensasi aktif via Token: ${adminToken}`;

            if (tokenScope === "session") {
                newStatus = "locked"; // remains locked for next sessions!
                noteText = `Dispensasi sesi ini via Token: ${adminToken}`;
            } else if (tokenScope === "weekly") {
                validUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                validUntilDate.setHours(23, 59, 59, 999);
                noteText = `Dispensasi 1 pekan via Token: ${adminToken}`;
            } else if (tokenScope === "permanent") {
                validUntilDate = null;
                noteText = `Dispensasi penuh via Token: ${adminToken}`;
            } else {
                // daily (default)
                validUntilDate = new Date();
                validUntilDate.setHours(23, 59, 59, 999);
                noteText = `Dispensasi harian via Token: ${adminToken}`;
            }

            // Update student's clearance status
            await (db as any)
                .update(studentClearances)
                .set({
                    status: newStatus,
                    validUntil: validUntilDate,
                    notes: noteText,
                    updatedAt: now,
                })
                .where(eq(studentClearances.id, studentClearance.id));
        }

        // Token validation if required
        if (template.requireToken) {
            if (!token) {
                return NextResponse.json(
                    { error: "Token diperlukan untuk memulai ujian", requireToken: true },
                    { status: 403 }
                );
            }
            if (token !== session.accessToken) {
                return NextResponse.json(
                    { error: "Token tidak valid", requireToken: true },
                    { status: 403 }
                );
            }
        }

        // Parse composition if it's a JSON string
        let composition: Record<string, number>;
        if (typeof template.questionComposition === 'string') {
            try {
                composition = JSON.parse(template.questionComposition);
            } catch {
                composition = {};
            }
        } else {
            composition = (template.questionComposition as Record<string, number>) || {};
        }

        // Parse bankIds if it's a JSON string
        let bankIds: string[];
        if (typeof template.bankIds === 'string') {
            try {
                bankIds = JSON.parse(template.bankIds);
            } catch {
                bankIds = [];
            }
        } else {
            bankIds = (template.bankIds as string[]) || [];
        }

        if (bankIds.length === 0) {
            return NextResponse.json({ error: "No question banks configured" }, { status: 400 });
        }

        // Fetch questions from banks based on composition
        const allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Parse randomization rules
        let randomizationRules: RandomizationRules = { mode: 'all' };
        try {
            let parsed = template.randomizationRules;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (parsed && typeof parsed === 'object') randomizationRules = parsed as RandomizationRules;
        } catch { randomizationRules = { mode: 'all' }; }

        // Determine if we should randomize
        const shouldRandomize = template.randomizeQuestions || (randomizationRules.mode && randomizationRules.mode !== 'all');

        // Select questions by type according to composition
        const selectedQuestions: any[] = [];
        const questionTypes = ['mc', 'complex_mc', 'matching', 'true_false', 'short', 'essay'];
        const allTypesToProcess = Array.from(new Set([...questionTypes, ...Object.keys(composition)]));

        for (const type of allTypesToProcess) {
            const count = composition[type] || 0;
            if (count > 0) {
                let typeQuestions = allQuestions.filter((q: typeof allQuestions[0]) => q.type === type);

                // Sort by questionNumber with createdAt fallback to ensure deterministic starting point
                typeQuestions.sort((a: any, b: any) => ((a.questionNumber || 0) - (b.questionNumber || 0)) || (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));

                // Check if this specific question type should be randomized
                const isTypeRandom = shouldRandomize && (
                    randomizationRules.mode === 'all' ||
                    (randomizationRules.mode === 'by_type' && (randomizationRules.types?.includes(type) ?? false)) ||
                    (randomizationRules.mode === 'exclude_type' && !(randomizationRules.excludeTypes?.includes(type) ?? false))
                );

                if (isTypeRandom) {
                    // If random enabled for this type, shuffle the pool before slicing
                    typeQuestions = typeQuestions.sort(() => Math.random() - 0.5);
                }

                selectedQuestions.push(...typeQuestions.slice(0, count));
            }
        }

        // Apply randomization based on template rules
        let questionOrder: string[];

        if (shouldRandomize) {
            if (template.essayAtEnd) {
                // Split essays and non-essays
                const essays = selectedQuestions.filter(q => q.type === 'essay');
                const nonEssays = selectedQuestions.filter(q => q.type !== 'essay');

                // Apply randomization rules to non-essays only
                const randomizedNonEssayIds = applyQuestionRandomization(nonEssays, randomizationRules);

                // Sort essays by questionNumber with createdAt fallback to preserve original order
                essays.sort((a: any, b: any) => ((a.questionNumber || 0) - (b.questionNumber || 0)) || (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));

                // Combine: Randomized non-essays + Sorted essays (at end)
                questionOrder = [...randomizedNonEssayIds, ...essays.map(q => q.id)];
            } else {
                questionOrder = applyQuestionRandomization(selectedQuestions, randomizationRules);
            }
        } else {
            // Strict sorting by questionNumber if randomization is disabled
            if (template.essayAtEnd) {
                const essays = selectedQuestions.filter(q => q.type === 'essay');
                const nonEssays = selectedQuestions.filter(q => q.type !== 'essay');

                // Sort internal arrays
                essays.sort((a, b) => ((a.questionNumber || 0) - (b.questionNumber || 0)) || (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));
                nonEssays.sort((a, b) => ((a.questionNumber || 0) - (b.questionNumber || 0)) || (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));

                questionOrder = [...nonEssays.map(q => q.id), ...essays.map(q => q.id)];
            } else {
                questionOrder = selectedQuestions
                    .sort((a, b) => ((a.questionNumber || 0) - (b.questionNumber || 0)) || (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()))
                    .map(q => q.id);
            }
        }

        // Check late tolerance
        const lateToleranceMinutes = Number(violationSettings?.lateToleranceMinutes ?? 0);
        const sessionStartTime = new Date(session.startTime).getTime();
        const diffMinutes = (now.getTime() - sessionStartTime) / (1000 * 60);
        const isLate = lateToleranceMinutes > 0 && diffMinutes > lateToleranceMinutes;

        // Create submission
        const totalMax = selectedQuestions.reduce((sum: number, q: any) => sum + (q.defaultPoints || 0), 0);
        const submissionId = crypto.randomUUID();

        if (isLate) {
            const reason = `Batas waktu toleransi keterlambatan masuk (${lateToleranceMinutes} menit) telah berakhir. Sesi dimulai pukul ${new Date(session.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`;

            await db.insert(submissions).values({
                id: submissionId,
                userId: studentId,
                sessionId: params.sessionId,
                status: "terminated",
                startTime: now,
                endTime: now,
                questionOrder,
                totalPoints: totalMax,
                earnedPoints: 0,
                score: 0,
                flaggedQuestions: [],
                violationCount: 1,
                violationLog: [{
                    type: "LATE_ENTRY",
                    details: reason,
                    timestamp: now.toISOString(),
                }],
                deviceId: deviceId || null,
                gradingStatus: "auto",
            });

            try {
                publishViolationEvent(
                    params.sessionId,
                    studentId,
                    user.name || "Siswa",
                    "LATE_ENTRY",
                    1,
                    reason,
                    true
                );
            } catch (e) {
                console.error("Error publishing late entry event:", e);
            }

            return NextResponse.json({
                error: "LATE_ENTRY",
                terminated: true,
                lateBlocked: true,
                message: `Batas waktu toleransi keterlambatan masuk (${lateToleranceMinutes} menit) telah berakhir. Akses ujian Anda terkunci otomatis. Silakan lapor ke pengawas di ruangan untuk meminta izin masuk.`
            }, { status: 403 });
        }

        await db.insert(submissions).values({
            id: submissionId,
            userId: studentId,
            sessionId: params.sessionId,
            status: "in_progress",
            questionOrder,
            totalPoints: totalMax,
            earnedPoints: 0,
            score: 0,
            flaggedQuestions: [],
            violationCount: 0,
            violationLog: [],
            deviceId: deviceId || null,
            gradingStatus: "auto",
        });

        // Broadcast student start event via SSE to proctor dashboard
        try {
            publishStudentStartEvent(
                params.sessionId,
                studentId,
                user.name || "Siswa"
            );
        } catch (e) {
            console.error("Error publishing student start event:", e);
        }

        return NextResponse.json({
            submissionId: submissionId,
            questionOrder,
            message: "Exam started successfully"
        }, { status: 201 });
    } catch (error: any) {
        const status = error.status || 500;
        if (status >= 500) {
            console.error("Error starting exam:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to start exam" },
            { status }
        );
    }
}
