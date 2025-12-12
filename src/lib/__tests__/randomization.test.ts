import { describe, it, expect } from 'vitest'
import {
    shuffleArray,
    applyQuestionRandomization,
    shuffleByCondition,
    shouldShuffleAnswers,
    type RandomizationRules,
    type Question
} from '../randomization'

describe('randomization', () => {
    describe('shuffleArray', () => {
        it('should return array with same length', () => {
            const input = [1, 2, 3, 4, 5]
            const result = shuffleArray(input)
            expect(result).toHaveLength(5)
        })

        it('should contain all original elements', () => {
            const input = ['a', 'b', 'c', 'd']
            const result = shuffleArray(input)
            expect(result.sort()).toEqual(input.sort())
        })

        it('should not mutate original array', () => {
            const input = [1, 2, 3]
            const original = [...input]
            shuffleArray(input)
            expect(input).toEqual(original)
        })

        it('should handle empty array', () => {
            const result = shuffleArray([])
            expect(result).toEqual([])
        })

        it('should handle single element', () => {
            const result = shuffleArray([42])
            expect(result).toEqual([42])
        })

        it('should eventually produce different order (randomness test)', () => {
            const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            let hasDifferentOrder = false

            // Try multiple times to see if we get different order
            for (let i = 0; i < 100; i++) {
                const result = shuffleArray(input)
                if (result.join(',') !== input.join(',')) {
                    hasDifferentOrder = true
                    break
                }
            }
            expect(hasDifferentOrder).toBe(true)
        })
    })

    describe('applyQuestionRandomization', () => {
        const mockQuestions: Question[] = [
            { id: 'q1', type: 'mc' },
            { id: 'q2', type: 'essay' },
            { id: 'q3', type: 'mc' },
            { id: 'q4', type: 'short_answer' },
            { id: 'q5', type: 'essay' },
        ]

        it('should return original order when no rules', () => {
            const result = applyQuestionRandomization(mockQuestions, null as unknown as RandomizationRules)
            expect(result).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'])
        })

        it('should return original order when mode is missing', () => {
            const result = applyQuestionRandomization(mockQuestions, {} as RandomizationRules)
            expect(result).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'])
        })

        it('should shuffle all questions in "all" mode', () => {
            const rules: RandomizationRules = { mode: 'all' }
            const result = applyQuestionRandomization(mockQuestions, rules)

            expect(result).toHaveLength(5)
            expect(result.sort()).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'].sort())
        })

        it('should only shuffle specified types in "by_type" mode', () => {
            const rules: RandomizationRules = { mode: 'by_type', types: ['mc'] }

            // Run multiple times to check pattern
            for (let i = 0; i < 10; i++) {
                const result = applyQuestionRandomization(mockQuestions, rules)

                // Essay and short_answer positions should be fixed
                expect(result[1]).toBe('q2') // essay stays at position 1
                expect(result[3]).toBe('q4') // short_answer stays at position 3
                expect(result[4]).toBe('q5') // essay stays at position 4

                // MC questions can be in positions 0 or 2
                expect(['q1', 'q3']).toContain(result[0])
                expect(['q1', 'q3']).toContain(result[2])
            }
        })

        it('should shuffle all except specified types in "exclude_type" mode', () => {
            const rules: RandomizationRules = { mode: 'exclude_type', excludeTypes: ['essay'] }

            for (let i = 0; i < 10; i++) {
                const result = applyQuestionRandomization(mockQuestions, rules)

                // Essay positions should be fixed
                expect(result[1]).toBe('q2')
                expect(result[4]).toBe('q5')
            }
        })

        it('should only shuffle specific positions in "specific_numbers" mode', () => {
            const rules: RandomizationRules = { mode: 'specific_numbers', questionNumbers: [1, 2] }

            for (let i = 0; i < 10; i++) {
                const result = applyQuestionRandomization(mockQuestions, rules)

                // Positions 2, 3, 4 (indices 2, 3, 4) should be fixed
                expect(result[2]).toBe('q3')
                expect(result[3]).toBe('q4')
                expect(result[4]).toBe('q5')

                // Positions 0 and 1 can swap
                expect(['q1', 'q2']).toContain(result[0])
                expect(['q1', 'q2']).toContain(result[1])
            }
        })
    })

    describe('shuffleByCondition', () => {
        const mockQuestions: Question[] = [
            { id: 'a', type: 'x' },
            { id: 'b', type: 'y' },
            { id: 'c', type: 'x' },
            { id: 'd', type: 'y' },
        ]

        it('should only shuffle items matching condition', () => {
            const shouldShuffle = (q: Question) => q.type === 'x'

            for (let i = 0; i < 10; i++) {
                const result = shuffleByCondition(mockQuestions, shouldShuffle)

                // y types should stay in place
                expect(result[1]).toBe('b')
                expect(result[3]).toBe('d')

                // x types can swap between positions 0 and 2
                expect(['a', 'c']).toContain(result[0])
                expect(['a', 'c']).toContain(result[2])
            }
        })

        it('should keep all in place when none match condition', () => {
            const shouldShuffle = () => false
            const result = shuffleByCondition(mockQuestions, shouldShuffle)
            expect(result).toEqual(['a', 'b', 'c', 'd'])
        })

        it('should shuffle all when all match condition', () => {
            const shouldShuffle = () => true
            const result = shuffleByCondition(mockQuestions, shouldShuffle)
            expect(result).toHaveLength(4)
            expect(result.sort()).toEqual(['a', 'b', 'c', 'd'].sort())
        })
    })

    describe('shouldShuffleAnswers', () => {
        it('should return false when shuffleAnswers is false', () => {
            expect(shouldShuffleAnswers('mc', false)).toBe(false)
            expect(shouldShuffleAnswers('complex_mc', false)).toBe(false)
        })

        it('should return true for shuffleable types when enabled', () => {
            expect(shouldShuffleAnswers('mc', true)).toBe(true)
            expect(shouldShuffleAnswers('complex_mc', true)).toBe(true)
            expect(shouldShuffleAnswers('true_false', true)).toBe(true)
            expect(shouldShuffleAnswers('matching', true)).toBe(true)
        })

        it('should return false for non-shuffleable types', () => {
            expect(shouldShuffleAnswers('essay', true)).toBe(false)
            expect(shouldShuffleAnswers('short_answer', true)).toBe(false)
        })
    })
})
