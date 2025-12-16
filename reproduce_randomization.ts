
import { applyQuestionRandomization, Question, RandomizationRules } from "./src/lib/randomization";

// Mock questions
const questions: Question[] = [];
// 5 MC
for (let i = 1; i <= 5; i++) questions.push({ id: `mc-${i}`, type: 'mc' });
// 5 Complex MC
for (let i = 1; i <= 5; i++) questions.push({ id: `cmc-${i}`, type: 'complex_mc' });
// 5 Matching
for (let i = 1; i <= 5; i++) questions.push({ id: `match-${i}`, type: 'matching' });
// 5 Essay
for (let i = 1; i <= 5; i++) questions.push({ id: `essay-${i}`, type: 'essay' });

console.log("Original Order Types:");
console.log(questions.map(q => q.type).join(", "));

// Case 1: Exclude Essay (Simulating what passes to logic safely)
// In route.ts, if essayAtEnd is true, we separate nonEssays first.
const nonEssays = questions.filter(q => q.type !== 'essay');
const essays = questions.filter(q => q.type === 'essay');

const rules: RandomizationRules = {
    mode: 'exclude_type',
    excludeTypes: ['essay']
    // Note: even if we pass 'essay' in excludeTypes, nonEssays list doesn't have them.
    // But let's see if it mixes types.
};

console.log("\n--- Randomizing Non-Essays Only (exclude_type: essay) ---");
const shuffledIds = applyQuestionRandomization(nonEssays, rules);

// Map back to types
const shuffledTypes = shuffledIds.map(id => {
    const q = questions.find(q => q.id === id);
    return q ? q.type : 'unknown';
});

console.log("Resulting Order Types:");
console.log(shuffledTypes.join(", "));

// Check if mixed
let groups = 0;
let lastType = '';
for (const t of shuffledTypes) {
    if (t !== lastType) {
        groups++;
        lastType = t;
    }
}

console.log(`\nNumber of type switches: ${groups - 1}`);
if (groups - 1 > 4) { // Ideally lots of switches
    console.log("SUCCESS: Types are mixed.");
} else {
    console.log("FAILURE: Types appear grouped.");
}
