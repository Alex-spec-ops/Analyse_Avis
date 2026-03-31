import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface SummarizeBody {
  positive: string[];
  negative: string[];
  neutral: string[];
}

export interface SentimentSummaries {
  positive: string[];
  negative: string[];
}

async function summarizeGroup(
  texts: string[],
  sentiment: "positifs" | "négatifs" | "neutres"
): Promise<string[]> {
  if (texts.length === 0) return [];

  const sample = texts.slice(0, 40).join("\n---\n");

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 250,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "Tu es un analyste d'avis clients. Tu identifies les points récurrents dans des avis et les résumes en bullets très courts.",
      },
      {
        role: "user",
        content: `Voici ${texts.length} avis ${sentiment} sur une entreprise :

${sample}

Identifie les 4 à 5 points qui reviennent le plus souvent dans ces avis ${sentiment}.
Réponds UNIQUEMENT avec les bullets, un par ligne, format strict :
• [point en 5-10 mots max]
• [point en 5-10 mots max]
...
Pas d'introduction, pas de conclusion, pas d'explication. Juste les bullets.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("•") || l.startsWith("-") || l.startsWith("*"))
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, 5);
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "Clé API Groq manquante. Ajoutez GROQ_API_KEY dans .env.local." },
      { status: 500 }
    );
  }

  let body: SummarizeBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { positive = [], negative = [] } = body;

  try {
    const [positiveBullets, negativeBullets] = await Promise.all([
      summarizeGroup(positive, "positifs"),
      summarizeGroup(negative, "négatifs"),
    ]);

    const summaries: SentimentSummaries = {
      positive: positiveBullets,
      negative: negativeBullets,
    };

    return Response.json(summaries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la génération du résumé.";
    return Response.json({ error: message }, { status: 502 });
  }
}
