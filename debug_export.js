const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'musiku3377',
        database: 'carta_exam'
    });

    // Find Ababil's submission
    const [subs] = await conn.execute(`
        SELECT s.id as submissionId, s.user_id, s.status, s.score, s.earned_points, s.total_points,
               u.name as studentName
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        WHERE u.name LIKE '%ABABIL%'
        LIMIT 5
    `);
    
    console.log('=== ABABIL SUBMISSIONS ===');
    console.log(JSON.stringify(subs, null, 2));
    
    if (subs.length === 0) {
        console.log('No submissions found for Ababil');
        await conn.end();
        return;
    }
    
    const submissionId = subs[0].submissionId;
    
    // Get all answers for this submission with question types
    const [answers] = await conn.execute(`
        SELECT a.id as answerId, a.submission_id, a.bank_question_id, a.question_id,
               a.is_correct, a.score, a.max_points, a.partial_points,
               a.grading_status,
               bq.type as questionType
        FROM answers a
        LEFT JOIN bank_questions bq ON a.bank_question_id = bq.id
        WHERE a.submission_id = ?
        ORDER BY bq.type, a.id
    `, [submissionId]);
    
    console.log('\n=== ANSWERS FOR ABABIL ===');
    console.log('Total answers:', answers.length);
    
    // Group by question type
    const byType = {};
    for (const ans of answers) {
        const type = ans.questionType || 'UNKNOWN';
        if (!byType[type]) byType[type] = [];
        byType[type].push(ans);
    }
    
    for (const [type, typeAnswers] of Object.entries(byType)) {
        console.log(`\n--- ${type} (${typeAnswers.length} answers) ---`);
        let correct = 0, totalScore = 0, totalMax = 0;
        for (const ans of typeAnswers) {
            const earned = ans.partial_points || ans.score || 0;
            totalScore += earned;
            totalMax += (ans.max_points || 0);
            if (ans.is_correct) correct++;
        }
        console.log(`  correct=${correct}, score=${totalScore}, maxScore=${totalMax}`);
    }
    
    // Also check: how many answers have NULL questionType
    const [nullTypeCount] = await conn.execute(`
        SELECT COUNT(*) as cnt
        FROM answers a
        LEFT JOIN bank_questions bq ON a.bank_question_id = bq.id
        WHERE a.submission_id = ? AND bq.type IS NULL
    `, [submissionId]);
    
    console.log('\nAnswers with NULL questionType:', nullTypeCount[0].cnt);
    
    // Check orphaned answers
    const [orphanedAnswers] = await conn.execute(`
        SELECT a.id, a.bank_question_id, a.question_id
        FROM answers a
        LEFT JOIN bank_questions bq ON a.bank_question_id = bq.id
        WHERE a.submission_id = ? AND bq.id IS NULL
    `, [submissionId]);
    
    console.log('Orphaned answers (bank_question_id not found):', orphanedAnswers.length);
    
    // isCorrect distribution
    console.log('\n=== isCorrect distribution ===');
    const [isCorrectDist] = await conn.execute(`
        SELECT bq.type, a.is_correct, COUNT(*) as cnt
        FROM answers a
        LEFT JOIN bank_questions bq ON a.bank_question_id = bq.id
        WHERE a.submission_id = ?
        GROUP BY bq.type, a.is_correct
        ORDER BY bq.type, a.is_correct
    `, [submissionId]);
    console.log(JSON.stringify(isCorrectDist, null, 2));
    
    await conn.end();
}

main().catch(console.error);
