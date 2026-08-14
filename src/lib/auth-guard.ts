import { getCurrentUser, SessionPayload, UserRole } from "@/lib/session";
import { ApiError } from "@/lib/api-handler";

/**
 * Enforce authentication and role-based access control (RBAC) in Route Handlers
 * 
 * @param allowedRoles Optional list of roles permitted to access this resource
 * @returns The authenticated SessionPayload
 * @throws ApiError with 401 if unauthenticated or 403 if unauthorized
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<SessionPayload> {
    const user = await getCurrentUser();

    if (!user) {
        throw new ApiError("Autentikasi diperlukan. Silakan login terlebih dahulu.", 401);
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new ApiError("Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.", 403);
    }

    return user;
}

/**
 * Enforce that the request is made by a student (or teacher/admin for preview)
 * and returns the authenticated user's ID
 */
export async function requireStudent(): Promise<SessionPayload> {
    return await requireAuth(["student", "admin", "teacher"]);
}
