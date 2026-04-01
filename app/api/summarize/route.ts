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
          "Tu es un analyste d'avis clients senior. Ton rôle est de fournir des résumés factuels et précis basés UNIQUEMENT sur les avis fournis. Ne mélange jamais les sentiments.",
      },
      {
        role: "user",
        content: `Voici ${texts.length} avis catégorisés comme "${sentiment}" sur une entreprise.
Votre mission : Identifiez UNIQUEMENT les points qui sont ${sentiment === "positifs" ? "REELLEMENT POSITIFS et appréciés" : "REELLEMENT NEGATIFS et critiqués"}.

Avis à analyser :
${sample}

Instructions de réponse :
- Ne listez que les points qui confirment le sentiment "${sentiment}".
- Si un avis contient un mélange, n'extrayez que la partie qui est ${sentiment}.
- Répondez par 3 à 5 bullets max (1 par ligne).
- Format strict : • [Point succinct en 5-10 mots]
- PAS de texte avant ou après.`,
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
