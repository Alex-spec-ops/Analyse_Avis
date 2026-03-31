import axios from "axios";
import * as cheerio from "cheerio";
import Sentiment from "sentiment";

const sentiment = new Sentiment();

// Register a French AFINN lexicon so French reviews are classified correctly
sentiment.registerLanguage("fr", {
  labels: {
    // Positive words
    "excellent": 4, "excellente": 4, "excellents": 4, "excellentes": 4,
    "parfait": 4, "parfaite": 4, "parfaits": 4, "parfaites": 4,
    "magnifique": 4, "magnifiques": 4, "superbe": 4, "superbes": 4,
    "fantastique": 4, "fantastiques": 4, "extraordinaire": 4, "extraordinaires": 4,
    "merveilleux": 3, "merveilleuse": 3, "merveilleuses": 3,
    "remarquable": 3, "remarquables": 3, "impressionnant": 3, "impressionnants": 3,
    "génial": 3, "géniale": 3, "géniaux": 3, "géniales": 3,
    "incroyable": 3, "incroyables": 3, "époustouflant": 3,
    "bon": 2, "bonne": 2, "bons": 2, "bonnes": 2,
    "bien": 2, "très bien": 3, "très bonne": 3, "très bon": 3,
    "agréable": 2, "agréables": 2, "plaisant": 2, "plaisante": 2,
    "satisfait": 2, "satisfaite": 2, "satisfaites": 2,
    "satisfaisant": 2, "satisfaisante": 2, "satisfaisants": 2,
    "content": 2, "contente": 2, "contents": 2, "contentes": 2,
    "heureux": 2, "heureuse": 2, "heureuses": 2,
    "ravi": 2, "ravie": 2, "ravis": 2, "ravies": 2,
    "pratique": 2, "pratiques": 2, "utile": 2, "utiles": 2,
    "efficace": 2, "efficaces": 2, "performant": 2, "performants": 2,
    "rapide": 2, "rapides": 2, "simple": 1, "simples": 1,
    "facile": 2, "faciles": 2, "intuitif": 2, "intuitive": 2,
    "qualité": 2, "premium": 2, "fiable": 2, "fiables": 2,
    "recommande": 2, "recommander": 2, "recommandé": 2, "recommandée": 2,
    "aimer": 2, "adorer": 3, "apprécier": 2,
    "positif": 2, "positive": 2, "positifs": 2, "positives": 2,
    "top": 2, "super": 2, "formidable": 3, "formidables": 3,
    "bravo": 2, "félicitations": 3, "impeccable": 3, "impeccables": 3,
    "professionnel": 2, "professionnels": 2, "professionnelle": 2,
    "sympa": 2, "sympathique": 2, "sympathiques": 2, "chaleureux": 2,
    "accueillant": 2, "accueillante": 2, "aimable": 2, "aimables": 2,
    "courtois": 2, "courtoise": 2, "attentionné": 2, "attentionnée": 2,
    "propre": 1, "propres": 1, "soigneux": 1, "soigneuse": 1,
    "luxueux": 3, "luxueuse": 3, "élégant": 2, "élégante": 2,
    "conforme": 1, "conformes": 1, "correct": 1, "correcte": 1,
    "livraison rapide": 3, "livraison": 1,
    // Negative words
    "mauvais": -2, "mauvaise": -2, "mauvaises": -2,
    "nul": -3, "nulle": -3, "nuls": -3, "nulles": -3,
    "horrible": -4, "horribles": -4, "affreux": -4, "atroce": -4,
    "catastrophique": -4, "catastrophiques": -4, "désastreux": -4, "désastreuse": -4,
    "terrible": -3, "terribles": -3, "épouvantable": -4, "épouvantables": -4,
    "décevant": -2, "décevante": -2, "décevants": -2, "décevantes": -2,
    "déception": -2, "déceptions": -2, "déçu": -2, "déçue": -2, "déçus": -2,
    "médiocre": -3, "médiocres": -3, "insuffisant": -2, "insuffisante": -2,
    "problème": -2, "problèmes": -2, "défaut": -2, "défauts": -2,
    "cassé": -3, "cassée": -3, "cassés": -3, "brisé": -3, "brisée": -3,
    "lent": -2, "lente": -2, "lents": -2, "lentes": -2, "lenteur": -2,
    "cher": -1, "chère": -1, "chers": -1, "chères": -1, "coûteux": -2,
    "arnaque": -4, "arnaques": -4, "escroquerie": -4, "voleur": -4,
    "inutile": -2, "inutiles": -2, "inefficace": -2, "inefficaces": -2,
    "compliqué": -2, "compliquée": -2, "compliqués": -2,
    "difficile": -1, "difficiles": -1,
    "faux": -2, "fausse": -2, "mensonge": -3, "mensonges": -3,
    "dangereux": -3, "dangereuse": -3,
    "refuser": -2, "refusé": -2, "refusée": -2, "refus": -2,
    "panne": -3, "pannes": -3, "dysfonctionnement": -3,
    "service client": 0, "service": 0,
    "déconseiller": -3, "déconseillé": -3, "fuir": -3,
    "honteux": -3, "honteuse": -3, "scandaleux": -3, "scandaleuse": -3,
    "inacceptable": -3, "inacceptables": -3, "inadmissible": -3,
    "pire": -3, "pires": -3, "jamais": -1,
    "problématique": -2, "problématiques": -2,
    "défectueux": -3, "défectueuse": -3,
    "rembourser": -1, "remboursement": -1,
    "attente": -1, "long": -1, "longue": -1, "retard": -2, "retards": -2,
    "erreur": -2, "erreurs": -2, "bug": -2, "bugs": -2,
    "déçoit": -2,
    "pas satisfait": -3, "pas content": -3,
  },
  scoringStrategy: {
    apply(tokens: string[], cursor: number, tokenScore: number) {
      // Handle French negation: "ne ... pas", "pas", "jamais", "rien"
      if (cursor > 0) {
        const prev = tokens[cursor - 1];
        if (prev === "pas" || prev === "jamais" || prev === "ne" || prev === "rien" || prev === "sans") {
          tokenScore = -tokenScore;
        }
      }
      return tokenScore;
    },
  },
});

const REVIEW_SELECTORS = [
  // Schema.org
  "[itemprop='reviewBody']",
  "[itemprop='description']",
  // Amazon
  "[data-hook='review-body'] span",
  "[data-hook='review-body']",
  // Trustpilot
  ".styles_reviewContent__0Q2Tg p",
  "[data-service-review-text-typography='true']",
  // TripAdvisor
  ".review-container .entry",
  ".partial_entry",
  "._T.FKffI",
  // Yelp
  ".comment__373c0__TBPAD p",
  ".raw__373c0__3rcx7",
  // Booking.com
  ".c-review__body",
  ".c-review-block__review-body",
  // Google Play
  ".h3YV2d",
  // App Store / generic mobile
  ".we-customer-review__body",
  // Generic patterns
  ".review-text",
  ".review__body",
  ".review-content",
  ".review_comment",
  ".reviewText",
  ".comment-text",
  ".comment-body",
  ".user-comment",
  '[class*="ReviewBody"]',
  '[class*="review-body"]',
  '[class*="review_body"]',
  // Structural fallbacks
  "article p",
  ".card p",
  ".review p",
  '[class*="review"] p',
  '[class*="avis"] p',
  '[class*="comment"] p',
  '[class*="testimonial"] p',
];

const RATING_SELECTORS = [
  "[itemprop='ratingValue']",
  "[data-rating]",
  "[aria-label*='star']",
  "[aria-label*='étoile']",
  "[aria-label*='out of']",
  ".rating",
  ".stars",
  '[class*="rating"]',
  '[class*="star"]',
];

export interface Review {
  text: string;
  rating: string | null;
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  source: string;
}

export interface SourceResult {
  url: string;
  reviews: Review[];
  error?: string;
  counts: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    averageScore: number;
  };
}

export interface ScrapeResult {
  sources: SourceResult[];
  aggregated: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    averageScore: number;
  };
  allReviews: Review[];
}

function classifySentiment(score: number): "positive" | "negative" | "neutral" {
  if (score > 1) return "positive";
  if (score < -1) return "negative";
  return "neutral";
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function scrapeOne(url: string): Promise<SourceResult> {
  const source = hostLabel(url);

  let html: string;
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      maxRedirects: 5,
    });
    html = response.data;
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err) && err.response
        ? `Erreur HTTP ${err.response.status}`
        : "Impossible d'accéder à la page (timeout ou accès refusé).";
    return { url, reviews: [], error: message, counts: { total: 0, positive: 0, negative: 0, neutral: 0, averageScore: 0 } };
  }

  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, [aria-hidden='true']").remove();

  let rawTexts: string[] = [];

  for (const selector of REVIEW_SELECTORS) {
    const found: string[] = [];
    $(selector).each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, " ");
      if (text.length >= 20) found.push(text);
    });
    if (found.length >= 2) {
      rawTexts = found;
      break;
    }
  }

  if (rawTexts.length === 0) {
    $("p").each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, " ");
      if (text.length >= 50 && text.length <= 2000) rawTexts.push(text);
    });
  }

  rawTexts = [...new Set(rawTexts)].slice(0, 100);

  if (rawTexts.length === 0) {
    return {
      url,
      reviews: [],
      error: "Aucun avis trouvé (le site utilise peut-être du JavaScript dynamique).",
      counts: { total: 0, positive: 0, negative: 0, neutral: 0, averageScore: 0 },
    };
  }

  const ratingElements: string[] = [];
  for (const sel of RATING_SELECTORS) {
    $(sel).each((_, el) => {
      const val =
        $(el).attr("data-rating") ||
        $(el).attr("content") ||
        $(el).attr("aria-label") ||
        $(el).text().trim();
      if (val) ratingElements.push(val);
    });
    if (ratingElements.length > 0) break;
  }

  const reviews: Review[] = rawTexts.map((text, i) => {
    const result = sentiment.analyze(text, { language: "fr" });
    return {
      text,
      rating: ratingElements[i] ?? null,
      sentiment: classifySentiment(result.score),
      score: result.score,
      source,
    };
  });

  const positive = reviews.filter((r) => r.sentiment === "positive").length;
  const negative = reviews.filter((r) => r.sentiment === "negative").length;
  const neutral = reviews.filter((r) => r.sentiment === "neutral").length;
  const averageScore = reviews.reduce((s, r) => s + r.score, 0) / reviews.length;

  return {
    url,
    reviews,
    counts: {
      total: reviews.length,
      positive,
      negative,
      neutral,
      averageScore: Math.round(averageScore * 100) / 100,
    },
  };
}

export async function POST(request: Request) {
  let urls: string[];

  try {
    const body = await request.json();
    const raw: unknown = body.urls;
    if (!Array.isArray(raw) || raw.length === 0) {
      return Response.json({ error: "Fournissez au moins une URL dans le champ 'urls'." }, { status: 400 });
    }
    urls = raw.map((u) => String(u).trim()).filter(Boolean);
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (urls.length > 10) {
    return Response.json({ error: "Maximum 10 URLs à la fois." }, { status: 400 });
  }

  // Validate URLs
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return Response.json({ error: `Protocole non supporté : ${url}` }, { status: 400 });
      }
    } catch {
      return Response.json({ error: `URL invalide : ${url}` }, { status: 400 });
    }
  }

  const sources = await Promise.all(urls.map(scrapeOne));

  const allReviews = sources.flatMap((s) => s.reviews);
  const total = allReviews.length;
  const positive = allReviews.filter((r) => r.sentiment === "positive").length;
  const negative = allReviews.filter((r) => r.sentiment === "negative").length;
  const neutral = allReviews.filter((r) => r.sentiment === "neutral").length;
  const averageScore = total > 0
    ? Math.round((allReviews.reduce((s, r) => s + r.score, 0) / total) * 100) / 100
    : 0;

  const result: ScrapeResult = {
    sources,
    aggregated: { total, positive, negative, neutral, averageScore },
    allReviews,
  };

  return Response.json(result);
}
