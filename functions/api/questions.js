// Cloudflare Pages Function: generates quiz questions.
// Reachable at: /api/questions

const GEMINI_MODEL = 'gemini-2.5-flash';
const OPENAI_MODEL = 'gpt-4o-mini';

function buildPrompt({ topic, categories, count, avoid }) {
  const subject = topic
    ? `the topic "${topic}"`
    : `these categories: ${(categories || []).join(', ')}`;
  const avoidLine = (avoid && avoid.length)
    ? `\nDo NOT repeat or rephrase any of these already-used questions:\n- ${avoid.slice(0, 60).join('\n- ')}\n`
    : '';
  return `You are writing questions for a live pub-quiz app.

Write exactly ${count} DISTINCT multiple-choice trivia questions about ${subject}.
${avoidLine}
Hard rules:
- All ${count} questions must be different from each other — no two testing the same fact, no rephrasings.
- Every question has exactly ONE unambiguously correct, well-established answer.
- Provide 4 options. The 3 wrong options must be the SAME KIND of thing as the correct answer
  (answer is a woman's name -> all options women's names; a football club -> all clubs; a year -> all years).
- Wrong options must be clearly wrong to someone who knows the subject, never secretly also correct.
- Each question under 110 characters, each option under 40 characters.

Return ONLY a JSON array, no markdown, no commentary, in exactly this shape:
[{"q":"question text","a":"correct answer","opts":["correct answer","wrong1","wrong2","wrong3"],"cat":"short label"}]
The "a" value must appear verbatim in "opts".`;
}

function extractJSON(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/