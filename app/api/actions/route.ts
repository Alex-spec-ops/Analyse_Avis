import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ActionsBody {
  negative: string[];
  company?: string;
}

export interface BusinessAction {
  problem: string;   // problème identifié (court)
  action: string;    // action concrète à mener
  priority: "haute" | "moyenne" | "faible";
}

export interface ActionsResult {
  actions: BusinessAction[];
}

function parsePriority(raw: string): BusinessAction["priority"] {
  const v = raw.toLowerCase().trim();
  if (v.includes("haute") || v.includes("high") || v.includes("élevée")) return "haute";
  if (v.includes("faible") || v.includes("low") || v.includes("basse")) return "faible";
  return "moyenne";
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "Clé API Groq manquante. Ajoutez GROQ_API_KEY dans .env.local." },
      { status: 500 }
    );
  }

  let body: ActionsBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { negative = [], company = "l'entreprise" } = body;

  if (negative.length === 0) {
    return Response.json({ actions: [] });
  }

  const sample = negative.slice(0, 50).join("\n---\n");

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Tu es un consultant en expérience client. Tu analyses des avis négatifs et proposes des actions business concrètes, réalistes et priorisées pour améliorer la satisfaction client.",
        },
        {
          role: "user",
          content: `Voici ${negative.length} avis négatifs sur ${company} :

${sample}

Identifie les 4 à 5 problèmes principaux et propose une action concrète pour chacun.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication, ce format exact :
[
  {"problem": "problème court (max 6 mots)", "action": "action concrète (max 12 mots)", "priority": "haute|moyenne|faible"},
  ...
]`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";

    // Extract JSON array even if the model wraps it in markdown
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Response.json({ actions: [] });

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return Response.json({ actions: [] });

    const actions: BusinessAction[] = parsed
      .slice(0, 5)
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        problem: String(item.problem ?? "").trim(),
        action: String(item.action ?? "").trim(),
        priority: parsePriority(String(item.priority ?? "")),
      }))
      .filter((a) => a.problem.length > 0 && a.action.length > 0);

    return Response.json({ actions } satisfies ActionsResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'analyse.";
    return Response.json({ error: message }, { status: 502 });
  }
}
