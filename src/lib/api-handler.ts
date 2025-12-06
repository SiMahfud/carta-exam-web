import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ApiResponse<T> = {
    data?: T;
    error?: string;
    details?: any;
    metadata?: any;
};

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number = 500) {
        super(message);
        this.status = status;
    }
}

export async function apiHandler<T>(
    handler: () => Promise<{ data: T; metadata?: any } | T>
): Promise<NextResponse<ApiResponse<T>>> {
    try {
        const result = await handler();

        // Check if result has data/metadata structure or is just data
        const response = (result && typeof result === 'object' && 'data' in result)
            ? result
            : { data: result };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error("API Error:", error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: "Validation Error", details: error.issues },
                { status: 400 }
            );
        }

        const status = error.status || 500;
        const message = error.message || "Internal Server Error";

        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}
