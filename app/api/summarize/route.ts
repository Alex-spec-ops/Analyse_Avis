import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface SummarizeBody {
  positive: string[];
  negative: string[];
  neutral: string[];
}

export interface SentimentSummaries {
  positive: string;
  negative: string;
  neutral: string;
}

async function summarizeGroup(
  texts: string[],
  sentiment: "positifs" | "négatifs" | "neutres"
): Promise<string> {
  if (texts.length === 0) {
    return `Aucun avis ${sentiment} à résumer.`;
  }

  const sample = texts.slice(0, 30).join("\n---\n");

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Voici ${texts.length} avis ${sentiment} extraits d'un ou plusieurs sites web :\n\n${sample}\n\nRédige un résumé concis (3-5 phrases) qui synthétise les thèmes récurrents, les points saillants et la tonalité générale de ces avis ${sentiment}. Réponds uniquement avec le résumé, sans introduction ni conclusion.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "Clé API Groq manquante. Ajoutez GROQ_API_KEY dans votre fichier .env.local." },
      { status: 500 }
    );
  }

  let body: SummarizeBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { positive = [], negative = [], neutral = [] } = body;

  try {
    const [positiveSummary, negativeSummary, neutralSummary] = await Promise.all([
      summarizeGroup(positive, "positifs"),
      summarizeGroup(negative, "négatifs"),
      summarizeGroup(neutral, "neutres"),
    ]);

    const summaries: SentimentSummaries = {
      positive: positiveSummary,
      negative: negativeSummary,
      neutral: neutralSummary,
    };

    return Response.json(summaries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la génération du résumé.";
    return Response.json({ error: message }, { status: 502 });
  }
}
