import { describe, it, expect } from "vitest";
import { safeJsonParse, safeJsonStringify } from "../json-utils";

describe("safeJsonParse", () => {
    it("should return fallback when input is null or undefined", () => {
        expect(safeJsonParse(null, { default: true })).toEqual({ default: true });
        expect(safeJsonParse(undefined, [1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("should return object or array directly if already parsed", () => {
        const obj = { a: 1, b: "two" };
        const arr = [1, 2, 3];
        expect(safeJsonParse(obj, {})).toBe(obj);
        expect(safeJsonParse(arr, [])).toBe(arr);
    });

    it("should parse standard valid JSON string", () => {
        const jsonStr = '{"name": "CartaExam", "version": 1}';
        const result = safeJsonParse<{ name: string; version: number }>(jsonStr, { name: "", version: 0 });
        expect(result).toEqual({ name: "CartaExam", version: 1 });
    });

    it("should parse array JSON string", () => {
        const jsonStr = '["A", "B", "C"]';
        const result = safeJsonParse<string[]>(jsonStr, []);
        expect(result).toEqual(["A", "B", "C"]);
    });

    it("should handle double-encoded JSON strings", () => {
        const inner = JSON.stringify({ key: "value", numbers: [1, 2] });
        const doubleEncoded = JSON.stringify(inner);

        const result = safeJsonParse<{ key: string; numbers: number[] }>(doubleEncoded, { key: "", numbers: [] });
        expect(result).toEqual({ key: "value", numbers: [1, 2] });
    });

    it("should handle double-encoded JSON array strings", () => {
        const inner = JSON.stringify(["item1", "item2"]);
        const doubleEncoded = JSON.stringify(inner);

        const result = safeJsonParse<string[]>(doubleEncoded, []);
        expect(result).toEqual(["item1", "item2"]);
    });

    it("should return fallback on malformed JSON string", () => {
        expect(safeJsonParse("{invalid json", { fallback: true })).toEqual({ fallback: true });
        expect(safeJsonParse("", "empty")).toBe("empty");
        expect(safeJsonParse("   ", "whitespace")).toBe("whitespace");
    });

    it("should return fallback on non-string primitives", () => {
        expect(safeJsonParse(12345, "fallback")).toBe("fallback");
        expect(safeJsonParse(true, "fallback")).toBe("fallback");
    });
});

describe("safeJsonStringify", () => {
    it("should stringify valid objects", () => {
        expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
        expect(safeJsonStringify([1, 2])).toBe("[1,2]");
    });

    it("should return fallback on circular structures", () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        expect(safeJsonStringify(circular, "error")).toBe("error");
    });
});
