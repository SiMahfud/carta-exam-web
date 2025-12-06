/**
 * Randomization Utility Functions
 * 
 * Provides functions for randomizing question order and answer options
 * based on template randomization rules.
 */

export interface RandomizationRules {
    mode: 'all' | 'by_type' | 'exclude_type' | 'specific_numbers';
    types?: string[];
    excludeTypes?: string[];
    questionNumbers?: number[];
    shuffleAnswers?: boolean;
}

export interface Question {
    id: string;
    type: string;
    [key: string]: any;
}

/**
 * Fisher-Yates shuffle algorithm for arrays
 */
export function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Apply question randomization based on rules
 * 
 * @param questions - Array of questions with id and type
 * @param rules - Randomization rules from template
 * @returns Array of question IDs in the new order
 */
export function applyQuestionRandomization(
    questions: Question[],
    rules: RandomizationRules
): string[] {
    if (!rules || !rules.mode) {
        // No rules, return original order
        return questions.map(q => q.id);
    }

    switch (rules.mode) {
        case 'all':
            // Shuffle all questions
            return shuffleArray(questions).map(q => q.id);

        case 'by_type':
            // Only shuffle questions of specified types
            return shuffleByCondition(
                questions,
                (q) => rules.types?.includes(q.type) || false
            );

        case 'exclude_type':
            // Shuffle all except specified types
            return shuffleByCondition(
                questions,
                (q) => !rules.excludeTypes?.includes(q.type)
            );

        case 'specific_numbers':
            // Only shuffle questions at specific positions (1-indexed)
            return shuffleByCondition(
                questions,
                (_, index) => rules.questionNumbers?.includes(index + 1) || false
            );

        default:
            return questions.map(q => q.id);
    }
}

/**
 * Shuffle only questions that match a condition, keeping others in place
 * 
 * @param questions - Array of questions
 * @param shouldShuffle - Function to determine if a question should be shuffled
 * @returns Array of question IDs with partial shuffling applied
 */
export function shuffleByCondition(
    questions: Question[],
    shouldShuffle: (question: Question, index: number) => boolean
): string[] {
    const result: (string | null)[] = new Array(questions.length).fill(null);
    const toShuffle: { question: Question; originalIndex: number }[] = [];

    // Separate questions into "to shuffle" and "fixed position"
    questions.forEach((question, index) => {
        if (shouldShuffle(question, index)) {
            toShuffle.push({ question, originalIndex: index });
        } else {
            // Keep in original position
            result[index] = question.id;
        }
    });

    // Shuffle the questions that should be shuffled
    const shuffledQuestions = shuffleArray(toShuffle.map(item => item.question));

    // Get the original indices where shuffled questions should go
    const shuffleIndices = toShuffle.map(item => item.originalIndex);

    // Place shuffled questions back into their original indices (but in shuffled order)
    shuffledQuestions.forEach((question, i) => {
        result[shuffleIndices[i]] = question.id;
    });

    return result.filter((id): id is string => id !== null);
}

/**
 * Check if answer options should be shuffled for a question type
 */
export function shouldShuffleAnswers(
    questionType: string,
    shuffleAnswers: boolean
): boolean {
    if (!shuffleAnswers) return false;

    // Types that have shuffleable options
    const shuffleableTypes = ['mc', 'complex_mc', 'true_false', 'matching'];
    return shuffleableTypes.includes(questionType);
}
