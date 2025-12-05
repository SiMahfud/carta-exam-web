export interface Subject {
    id: string;
    name: string;
}

export interface QuestionBank {
    id: string;
    name: string;
    subjectId: string;
    questionCount: number;
    description?: string;
}

export interface ViolationSettings {
    detectTabSwitch: boolean;
    detectCopyPaste: boolean;
    detectRightClick: boolean;
    detectScreenshot: boolean;
    detectDevTools: boolean;
    cooldownSeconds: number;
    mode: 'lenient' | 'strict' | 'disabled';
}

export interface ExamTemplateFormData {
    name: string;
    description: string;
    subjectId: string;
    bankIds: string[];
    questionComposition: {
        mc: number;
        complex_mc: number;
        matching: number;
        short: number;
        essay: number;
        true_false: number;
    };
    durationMinutes: number;
    totalScore: number;
    displaySettings: {
        showQuestionNumber: boolean;
        showRemainingTime: boolean;
        showNavigation: boolean;
    };
    enableLockdown: boolean;
    requireToken: boolean;
    maxViolations: number;
    violationSettings: ViolationSettings;
    // New fields
    targetType: 'all' | 'classes' | 'grades' | 'students';
    targetIds: string[];
    randomizationRules: {
        mode: 'all' | 'by_type' | 'exclude_type' | 'specific_numbers';
        types?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
        excludeTypes?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
        questionNumbers?: number[];
    };
}
