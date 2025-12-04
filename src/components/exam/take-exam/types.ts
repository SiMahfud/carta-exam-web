export interface Question {
    id: string;
    type: "mc" | "complex_mc" | "matching" | "short" | "essay";
    questionText: string;
    options?: { label: string; text: string }[];
    pairs?: { left: string; right: string }[];
    leftItems?: string[];
    rightItems?: string[];
    points: number;
}

export interface Answer {
    questionId: string;
    answer: any;
    isFlagged: boolean;
}
