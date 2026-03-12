export function computeDailyCounts(quiz, answers) {
  const answerMap = new Map(answers.map((item) => [item.questionId, item.answerIndex]));
  let correct = 0;
  let wrong = 0;
  quiz.questions.forEach((question) => {
    if (!answerMap.has(question.id)) return;
    const selected = answerMap.get(question.id);
    if (selected === question.answer) {
      correct += 1;
    } else {
      wrong += 1;
    }
  });
  return { correct, wrong };
}

export function sanitizeQuiz(quiz) {
  return {
    ...quiz,
    questions: quiz.questions.map(({ answer, ...rest }) => rest)
  };
}

export function computeScore(quiz, answers, userId) {
  return quiz.questions.reduce((acc, question) => {
    const record = answers.find(
      (item) => item.user_id === userId && item.question_id === question.id
    );
    if (!record) return acc;
    return acc + (record.answer_index === question.answer ? 1 : 0);
  }, 0);
}

export function computeAnswerStats(quiz, answers) {
  const correctByQuestion = new Map();
  quiz.questions.forEach((question) => {
    correctByQuestion.set(question.id, question.answer);
  });

  return answers.reduce((acc, answer) => {
    const correctIndex = correctByQuestion.get(answer.question_id);
    if (correctIndex === undefined) return acc;
    if (!acc[answer.user_id]) {
      acc[answer.user_id] = { correctCount: 0, wrongCount: 0 };
    }
    if (answer.answer_index === correctIndex) {
      acc[answer.user_id].correctCount += 1;
    } else {
      acc[answer.user_id].wrongCount += 1;
    }
    return acc;
  }, {});
}
