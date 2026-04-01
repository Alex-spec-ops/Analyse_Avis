import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ActionsBody {
  negative: string[];
  positive: string[];
  company?: string;
  negativePct: number;
}

export interface BusinessAction {
  problem: string;
  action: string;
  priority: "haute" | "moyenne" | "faible";
  why: string;
  roi: number;      // % de réduction des avis négatifs attendu
  weeks: number;    // semaines avant résultats visibles
}

export interface ActionsProjection {
  currentNegativePct: number;
  projectedNegativePct: number;
  satisfactionGain: number;
  roiGlobal: number;
}

export interface ActionsResult {
  actions: BusinessAction[];
  projection: ActionsProjection;
}

function parsePriority(raw: string): BusinessAction["priority"] {
  const v = raw.toLowerCase().trim();
  if (v.includes("haute") || v.includes("high")) return "haute";
  if (v.includes("faible") || v.includes("low")) return "faible";
  return "moyenne";
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: "Clé API Groq manquante." }, { status: 500 });
  }

  let body: ActionsBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { negative = [], positive = [], company = "l'entreprise", negativePct = 0 } = body;

  if (negative.length === 0) {
    return Response.json({ actions: [], projection: { currentNegativePct: 0, projectedNegativePct: 0, satisfactionGain: 0, roiGlobal: 0 } });
  }

  const negativeSample = negative.slice(0, 40).join("\n---\n");
  const positiveSample = positive.slice(0, 10).join("\n---\n");

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `Tu es un consultant senior en expérience client et stratégie business.
Tu analyses des avis clients réels et produis des recommandations business chiffrées, précises et actionnables.
Tes estimations ROI sont basées sur des benchmarks sectoriels réels (études McKinsey, Bain, HBR).`,
        },
        {
          role: "user",
          content: `Analyse des avis clients de ${company}.

AVIS NÉGATIFS (${negative.length} avis — ${negativePct}% du total) :
${negativeSample}

POINTS POSITIFS À PRÉSERVER (${positive.length} avis) :
${positiveSample}

Identifie les 4-5 problèmes principaux et génère un plan d'action business complet.

Réponds UNIQUEMENT en JSON valide (pas de markdown), format exact :
{
  "actions": [
    {
      "problem": "Problème court (5 mots max)",
      "action": "Action concrète et spécifique (12 mots max)",
      "priority": "haute|moyenne|faible",
      "why": "Explication en 1-2 phrases : pourquoi cette action sera efficace, avec un chiffre benchmark si possible.",
      "roi": 20,
      "weeks": 8
    }
  ],
  "projection": {
    "currentNegativePct": ${negativePct},
    "projectedNegativePct": <estimation après toutes les actions appliquées, réaliste>,
    "satisfactionGain": <gain en étoiles estimé, ex: 0.6>,
    "roiGlobal": <% de réduction globale des avis négatifs>
  }
}

Règles strictes :
- roi = % de réduction des avis négatifs attribuable à cette action seule (entre 5 et 35)
- weeks = délai réaliste avant résultats mesurables (entre 4 et 24)
- projectedNegativePct doit être inférieur à currentNegativePct mais crédible (pas 0%)
- satisfactionGain entre 0.2 et 1.5 étoiles`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse JSON invalide");

    const parsed = JSON.parse(jsonMatch[0]) as {
      actions?: unknown[];
      projection?: Partial<ActionsProjection>;
    };

    const actions: BusinessAction[] = (parsed.actions ?? [])
      .slice(0, 5)
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        problem: String(item.problem ?? "").trim(),
        action: String(item.action ?? "").trim(),
        priority: parsePriority(String(item.priority ?? "")),
        why: String(item.why ?? "").trim(),
        roi: Math.min(35, Math.max(5, Number(item.roi) || 15)),
        weeks: Math.min(24, Math.max(2, Number(item.weeks) || 8)),
      }))
      .filter((a) => a.problem.length > 0 && a.action.length > 0);

    const p = parsed.projection ?? {};
    const projection: ActionsProjection = {
      currentNegativePct: negativePct,
      projectedNegativePct: Math.max(
        1,
        Math.min(negativePct - 5, Number(p.projectedNegativePct) || Math.round(negativePct * 0.55))
      ),
      satisfactionGain: Math.min(1.5, Math.max(0.1, Number(p.satisfactionGain) || 0.6)),
      roiGlobal: Math.min(75, Math.max(10, Number(p.roiGlobal) || 40)),
    };

    return Response.json({ actions, projection } satisfies ActionsResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'analyse.";
    return Response.json({ error: message }, { status: 502 });
  }
}
