// AI Nook Finder — powered by Groq (llama model)

export async function getNookRecommendation(mood: string, activity: string) {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) {
    console.warn('NEXT_PUBLIC_GROQ_API_KEY is not set.');
    return null;
  }

  const prompt = `I am looking for a "nook" (a cozy study spot or cafe).
  My current mood is: ${mood}.
  I plan to do: ${activity}.

  Please suggest 3 types of environments that would suit me.
  For each, provide:
  1. A catchy name for this type of nook.
  2. Why it fits my mood and activity.
  3. What specific features I should look for (e.g. "dim lighting", "window seat").

  Respond ONLY with a valid JSON array of objects with keys: "name", "reason", "features" (array of strings). No markdown, no explanation.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content ?? '{}');
    return Array.isArray(parsed) ? parsed : (parsed.recommendations ?? parsed.nooks ?? null);
  } catch (error) {
    console.error('Groq AI Error:', error);
    return null;
  }
}
