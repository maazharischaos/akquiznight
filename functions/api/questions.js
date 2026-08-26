export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'GEMINI_API_KEY environment variable is missing in Cloudflare settings.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json();
    const topic = body.topic || 'General Knowledge';
    const count = Math.min(body.count || 10, 20);
    const avoid = body.avoid || [];

    const prompt = `You are a trivia question generator. Generate ${count} multiple choice questions about "${topic}".
${avoid.length > 0 ? 'DO NOT include questions similar to these: ' + avoid.join('; ') : ''}

Respond STRICTLY in valid JSON format with no Markdown wrapping or text outside the JSON array. Format:
[
  {
    "q": "Question text here?",
    "a": "Exact Correct Answer",
    "cat": "${topic}",
    "opts": ["Exact Correct Answer", "Wrong Choice 1", "Wrong Choice 2", "Wrong Choice 3"]
  }
]`;

    // Official production endpoint for Gemini 1.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: 'Gemini API call failed', detail: errorText }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiResponse.json();
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Clean up potential markdown code block formatting
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    const questions = JSON.parse(rawText);

    return new Response(JSON.stringify({ questions, model: 'gemini-1.5-flash' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process question request', detail: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}