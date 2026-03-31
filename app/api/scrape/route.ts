import axios from "axios";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import Sentiment from "sentiment";

const sentiment = new Sentiment();

// ── French AFINN lexicon ──────────────────────────────────────
sentiment.registerLanguage("fr", {
  labels: {
    "excellent": 4, "excellente": 4, "excellents": 4, "excellentes": 4,
    "parfait": 4, "parfaite": 4, "parfaits": 4, "parfaites": 4,
    "magnifique": 4, "magnifiques": 4, "superbe": 4, "superbes": 4,
    "fantastique": 4, "fantastiques": 4, "extraordinaire": 4, "extraordinaires": 4,
    "merveilleux": 3, "merveilleuse": 3, "merveilleuses": 3,
    "remarquable": 3, "remarquables": 3, "impressionnant": 3, "impressionnants": 3,
    "génial": 3, "géniale": 3, "géniaux": 3, "géniales": 3,
    "incroyable": 3, "incroyables": 3, "époustouflant": 3,
    "bon": 2, "bonne": 2, "bons": 2, "bonnes": 2,
    "bien": 2, "agréable": 2, "agréables": 2, "plaisant": 2, "plaisante": 2,
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
    "livraison": 1, "confortable": 2, "confortables": 2,
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
    "déconseiller": -3, "déconseillé": -3, "fuir": -3,
    "honteux": -3, "honteuse": -3, "scandaleux": -3, "scandaleuse": -3,
    "inacceptable": -3, "inacceptables": -3, "inadmissible": -3,
    "pire": -3, "pires": -3, "jamais": -1,
    "problématique": -2, "problématiques": -2,
    "défectueux": -3, "défectueuse": -3,
    "rembourser": -1, "remboursement": -1,
    "attente": -1, "retard": -2, "retards": -2,
    "erreur": -2, "erreurs": -2, "bug": -2, "bugs": -2,
    "déçoit": -2, "dégoûtant": -4, "dégoûtante": -4,
  },
  scoringStrategy: {
    apply(tokens: string[], cursor: number, tokenScore: number) {
      if (cursor > 0) {
        const prev = tokens[cursor - 1];
        if (["pas", "jamais", "ne", "rien", "sans", "guère"].includes(prev)) {
          tokenScore = -tokenScore;
        }
      }
      return tokenScore;
    },
  },
});

// ── Types ─────────────────────────────────────────────────────

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

type RawItem = { text: string; rating: string | null };

// ── HTTP helpers ──────────────────────────────────────────────

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

async function fetchHtml(url: string, retries = 2): Promise<string> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const origin = (() => { try { return new URL(url).origin; } catch { return ""; } })();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get<string>(url, {
        timeout: 20000,
        responseType: "text",
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Referer": origin || "https://www.google.fr/",
          "Cache-Control": "max-age=0",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
        },
        maxRedirects: 5,
        decompress: true,
      });
      return res.data;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  throw new Error("Echec après plusieurs tentatives");
}

// ── Text utilities ────────────────────────────────────────────

function clean(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function isValid(text: string): boolean {
  return text.length >= 25 && text.length <= 5000;
}

function hostLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function classifySentiment(score: number): "positive" | "negative" | "neutral" {
  if (score > 1) return "positive";
  if (score < -1) return "negative";
  return "neutral";
}

function dedup(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();
  return items.filter(({ text }) => {
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

// ── Strategy 1 : JSON-LD (schema.org Review) ─────────────────

function extractJsonLd($full: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];

  $full('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $full(el).html() || "";
      const parsed = JSON.parse(raw);
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

      function walk(node: unknown): void {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        const o = node as Record<string, unknown>;

        if (o["@type"] === "Review" || o["@type"] === "UserReview") {
          const body = (o.reviewBody || o.description || "") as string;
          const rating = ((o.reviewRating as Record<string, unknown>)?.ratingValue ?? null) as string | null;
          if (isValid(clean(body))) results.push({ text: clean(body), rating: rating?.toString() ?? null });
          return;
        }
        const revArr = o.review || o.reviews || [];
        (Array.isArray(revArr) ? revArr : [revArr]).forEach(walk);
        for (const v of Object.values(o)) {
          if (typeof v === "object") walk(v);
        }
      }
      items.forEach(walk);
    } catch { /* ignore */ }
  });

  return results;
}

// ── Strategy 2 : __NEXT_DATA__ (Next.js SSR) ──────────────────

function extractNextData(html: string): RawItem[] {
  const results: RawItem[] = [];
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];

  try {
    const json = JSON.parse(match[1]);

    function walk(node: unknown, depth = 0): void {
      if (depth > 20 || !node || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach((n) => walk(n, depth + 1)); return; }
      const o = node as Record<string, unknown>;

      const text = (o.text || o.body || o.reviewBody || o.content || o.comment || "") as string;
      if (typeof text === "string" && isValid(text)) {
        const ratingObj = o.rating || o.reviewRating || o.stars;
        let rating: string | null = null;
        if (typeof ratingObj === "number") rating = String(ratingObj);
        else if (typeof ratingObj === "object" && ratingObj !== null) {
          const ro = ratingObj as Record<string, unknown>;
          rating = String(ro.stars || ro.ratingValue || ro.value || "") || null;
        }
        results.push({ text: clean(text), rating });
        return;
      }
      for (const v of Object.values(o)) walk(v, depth + 1);
    }

    walk(json);
  } catch { /* ignore */ }

  return results;
}

// ── Strategy 3 : Site-specific CSS parsers ────────────────────

// Trustpilot ─────────────────────────────────────────────────
function parseTrustpilot($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    'article[data-service-review-card-paper]',
    'article[class*="styles_reviewCard"]',
    'div[class*="review-card"]',
  ];
  for (const sel of selectors) {
    const cards = $(sel).toArray();
    if (cards.length < 2) continue;
    for (const card of cards) {
      const $c = $(card);
      const text = clean(
        $c.find('[data-service-review-text-typography="true"] p').text() ||
        $c.find('p[class*="typography_body"]').last().text() ||
        $c.find('[class*="reviewBody"] p').text() ||
        $c.find("p").last().text()
      );
      const imgAlt = $c.find('img[alt*="star"], img[alt*="Rated"], img[alt*="étoile"]').attr("alt") || "";
      const ratingMatch = imgAlt.match(/\d/);
      if (isValid(text)) results.push({ text, rating: ratingMatch?.[0] ?? null });
    }
    if (results.length >= 2) break;
  }
  return results;
}

// TripAdvisor ─────────────────────────────────────────────────
function parseTripAdvisor($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const cardSelectors = [
    '[data-test-target="HR_CC_CARD"]',
    'div[class*="review_"]',
    'div[class*="Review_"]',
    '.review-container',
    'div[class*="listItem"]',
  ];
  for (const sel of cardSelectors) {
    const cards = $(sel).toArray();
    if (cards.length < 2) continue;
    for (const card of cards) {
      const $c = $(card);
      const text = clean(
        $c.find('[data-test-target="review-body"] span').text() ||
        $c.find('[class*="partial_entry"]').text() ||
        $c.find("q").text() ||
        $c.find('[class*="reviewBody"]').text()
      );
      const bubbleClass = $c.find('[class*="ui_bubble_rating"], [class*="rating_"]').attr("class") || "";
      const bm = bubbleClass.match(/bubble_(\d+)/);
      const rating = bm ? String(parseInt(bm[1]) / 10) : null;
      if (isValid(text)) results.push({ text, rating });
    }
    if (results.length >= 2) break;
  }
  if (results.length === 0) {
    $(".partial_entry, .review-container .entry").each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
  }
  return results;
}

// Amazon ──────────────────────────────────────────────────────
function parseAmazon($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  $('[data-hook="review"]').each((_, el) => {
    const $el = $(el);
    const text = clean($el.find('[data-hook="review-body"] span').text());
    const ratingText = $el.find('[data-hook="review-star-rating"] .a-icon-alt, [data-hook="cmps-review-star-rating"] .a-icon-alt').text();
    const rm = ratingText.match(/^[\d,.]+/);
    if (isValid(text)) results.push({ text, rating: rm ? rm[0] : null });
  });
  return results;
}

// Booking.com ─────────────────────────────────────────────────
function parseBooking($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const cardSelectors = [
    '[data-testid="review-card"]', '[class*="review_item"]',
    '.c-review-block', '.bui-review-card',
  ];
  for (const sel of cardSelectors) {
    const cards = $(sel).toArray();
    if (cards.length < 2) continue;
    for (const card of cards) {
      const $c = $(card);
      const pos = clean($c.find('[data-testid="review-pos-text"], .c-review__body.review-pos, [class*="review-pos"]').text());
      const neg = clean($c.find('[data-testid="review-neg-text"], .c-review__body.review-neg, [class*="review-neg"]').text());
      const full = clean($c.find('[class*="reviewText"], .c-review__body').not('[class*="pos"]').not('[class*="neg"]').text());
      const text = full || [pos, neg].filter(Boolean).join(" / ");
      const scoreEl = $c.find('[class*="review-score"], .bui-review-score__badge').first().text().trim();
      if (isValid(text)) results.push({ text, rating: scoreEl || null });
    }
    if (results.length >= 2) break;
  }
  return results;
}

// Pages Jaunes ────────────────────────────────────────────────
function parsePagesJaunes($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    ".bi-review-comment-text", ".review-card-text",
    ".opinner-text", '[class*="review-comment"]',
    '[class*="review__text"]', ".review__comment",
    '[class*="reviewComment"]',
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Yelp ────────────────────────────────────────────────────────
function parseYelp($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const cardSelectors = [
    'li[class*="y-list-item"]', 'div[class*="review__"]',
    'div[class*="Review__"]', 'section[class*="review"]',
  ];
  for (const sel of cardSelectors) {
    const cards = $(sel).toArray();
    if (cards.length < 2) continue;
    for (const card of cards) {
      const $c = $(card);
      const text = clean($c.find("p, span[lang]").first().text());
      if (isValid(text)) results.push({ text, rating: null });
    }
    if (results.length >= 2) break;
  }
  return results;
}

// G2 / Capterra (software) ────────────────────────────────────
function parseSoftwareReview($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  $('[itemprop="reviewBody"], [data-review-content], [class*="review__body"], [class*="review-body"]').each((_, el) => {
    const text = clean($(el).text());
    if (isValid(text)) results.push({ text, rating: null });
  });
  return results;
}

// App Store (apps.apple.com) ──────────────────────────────────
function parseAppStore($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  $(".we-customer-review, [class*='customerReview']").each((_, el) => {
    const $el = $(el);
    const text = clean($el.find(".we-customer-review__body, p").text());
    const rating = $el.find("[aria-label*='étoile'], [aria-label*='star']").attr("aria-label")?.match(/\d/)?.[0] ?? null;
    if (isValid(text)) results.push({ text, rating });
  });
  return results;
}

// Google Play (play.google.com) ───────────────────────────────
function parseGooglePlay($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  $(".h3YV2d, [jsname='fbQN7e'], [class*='review-body']").each((_, el) => {
    const text = clean($(el).text());
    if (isValid(text)) results.push({ text, rating: null });
  });
  return results;
}

// Avis Vérifiés (avis-verifies.com) ──────────────────────────
function parseAvisVerifies($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    '[class*="review_comment"]', '[class*="notation-review"]',
    '[class*="avis-text"]', ".review-comment", ".avis-content",
    '[class*="reviewContent"]', '[class*="av-comment"]',
    ".av-stars-comment", "div[id*='review'] p",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Custplace ───────────────────────────────────────────────────
function parseCustplace($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    '[class*="review-text"]', '[class*="reviewText"]',
    '[class*="comment-content"]', '[class*="avis-texte"]',
    ".review__content p", ".review-body", ".cp-review-comment",
    '[data-review-text]', 'div[class*="ReviewContent"]',
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  // Fallback: article paragraphs with sufficient length
  $("article p, section p").each((_, el) => {
    const text = clean($(el).text());
    if (text.length >= 40 && text.length <= 2000) results.push({ text, rating: null });
  });
  return results;
}

// Opineo ──────────────────────────────────────────────────────
function parseOpineon($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    ".review-opinion", '[class*="opinion-text"]', '[class*="review-description"]',
    ".op-review-text", ".testimonial-text", '[class*="avis-description"]',
    "div.review p", ".customer-review-content",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Indeed (avis employés) ──────────────────────────────────────
function parseIndeed($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    '[data-testid="review-text"]', '[class*="review-body-text"]',
    ".cmp-review-text", '[class*="ReviewContent"]',
    'div[class*="review"] p[class*="text"]',
    ".icl-u-color--secondary",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Glassdoor ───────────────────────────────────────────────────
function parseGlassdoor($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    '[class*="review-text"]', '[data-test="review-text"]',
    '[class*="ReviewText"]', ".gdReview .mt", ".empReview p",
    'span[data-test="pros"]', 'span[data-test="cons"]',
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Fnac ────────────────────────────────────────────────────────
function parseFnac($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    ".userReview-text", ".review-description", '[class*="review-content"]',
    ".product-review-text", '[class*="UserReview"] p',
    ".fnac-review-comment", ".review__description",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Cdiscount ───────────────────────────────────────────────────
function parseCdiscount($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    ".reviewComment", '[class*="review-comment"]',
    ".avCommentaire", ".cdv-review-text",
    '[data-test="review-text"]', ".userReviewText",
    ".note-comment p", '[class*="ReviewText"]',
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Darty ───────────────────────────────────────────────────────
function parseDarty($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    ".product-review-content", ".review-text",
    '[class*="ReviewContent"]', ".avis-texte",
    ".review-description", "div.review p",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Ekomi ───────────────────────────────────────────────────────
function parseEkomi($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    ".review__comment", '[class*="ekomi-review"]',
    ".feedback-text", ".review-comment-text",
    '[class*="FeedbackText"]', ".ekomi-comment",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// Société.com ─────────────────────────────────────────────────
function parseSociete($: CheerioAPI): RawItem[] {
  const results: RawItem[] = [];
  const selectors = [
    ".avis-comment", '[class*="avis-text"]',
    ".societe-review-text", ".notation-comment",
    '[class*="review-comment"]', ".avis-content p",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) results.push({ text, rating: null });
    });
    if (results.length >= 2) return results;
  }
  return results;
}

// ── Strategy 4 : Generic fallback ────────────────────────────

function parseGeneric($: CheerioAPI): RawItem[] {
  // Only structured review selectors — no generic <p> fallback that would pick up non-review content
  const SELECTORS = [
    "[itemprop='reviewBody']",
    "[itemprop='reviewBody'] p",
    "[data-hook='review-body'] span",
    "[data-hook='review-body']",
    "[data-service-review-text-typography='true'] p",
    ".styles_reviewContent__0Q2Tg p",
    ".c-review__body",
    ".c-review-block__review-body",
    "[class*='ReviewBody'] p",
    "[class*='review-body'] p",
    "[class*='review_body'] p",
    "[class*='review-text']",
    "[class*='reviewText']",
    "[class*='review__body']",
    "[class*='review-content']",
    "[class*='review_comment']",
    "[class*='avis-text']",
    "[class*='avis-content']",
    "[class*='testimonial-text']",
    "[class*='comment-text']",
    "[class*='comment-body']",
  ];

  for (const sel of SELECTORS) {
    const found: RawItem[] = [];
    $(sel).each((_, el) => {
      const text = clean($(el).text());
      if (isValid(text)) found.push({ text, rating: null });
    });
    if (found.length >= 2) return found;
  }

  return [];
}

// ── Site detector ─────────────────────────────────────────────

type SiteKey =
  | "trustpilot" | "tripadvisor" | "amazon" | "booking"
  | "yelp" | "pagesjaunes" | "appstore" | "googleplay"
  | "avisverifies" | "custplace" | "opineo" | "indeed"
  | "glassdoor" | "fnac" | "cdiscount" | "darty"
  | "ekomi" | "societe" | "software" | "generic";

function detectSite(url: string): SiteKey {
  const h = url.toLowerCase();
  if (h.includes("trustpilot.")) return "trustpilot";
  if (h.includes("tripadvisor.")) return "tripadvisor";
  if (h.includes("amazon.")) return "amazon";
  if (h.includes("booking.com")) return "booking";
  if (h.includes("yelp.")) return "yelp";
  if (h.includes("pagesjaunes.fr")) return "pagesjaunes";
  if (h.includes("apps.apple.com")) return "appstore";
  if (h.includes("play.google.com")) return "googleplay";
  if (h.includes("avis-verifies.") || h.includes("verified-reviews.")) return "avisverifies";
  if (h.includes("custplace.com")) return "custplace";
  if (h.includes("opineo.fr")) return "opineo";
  if (h.includes("indeed.fr") || h.includes("indeed.com")) return "indeed";
  if (h.includes("glassdoor.fr") || h.includes("glassdoor.com")) return "glassdoor";
  if (h.includes("fnac.com")) return "fnac";
  if (h.includes("cdiscount.com")) return "cdiscount";
  if (h.includes("darty.com")) return "darty";
  if (h.includes("ekomi.fr") || h.includes("ekomi.co")) return "ekomi";
  if (h.includes("societe.com") || h.includes("xn--socit-esab.com")) return "societe";
  if (h.includes("g2.com") || h.includes("capterra.") || h.includes("getapp.")) return "software";
  return "generic";
}

// ── Company discovery ─────────────────────────────────────────

function isLikelyUrl(s: string): boolean {
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) return true;
  if (!t.includes(" ") && /\.[a-z]{2,}(\/|$)/i.test(t)) return true;
  return false;
}

function normalizeUrl(s: string): string {
  const t = s.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

async function findTrustpilot(company: string): Promise<string | null> {
  try {
    const url = `https://fr.trustpilot.com/search?query=${encodeURIComponent(company)}`;
    const html = await fetchHtml(url);
    const ndm = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndm) {
      const data = JSON.parse(ndm[1]);
      function findBU(o: unknown): string | null {
        if (!o || typeof o !== "object") return null;
        if (Array.isArray(o)) { for (const i of o) { const r = findBU(i); if (r) return r; } return null; }
        const obj = o as Record<string, unknown>;
        if (typeof obj.identifyingName === "string" && obj.identifyingName)
          return `https://fr.trustpilot.com/review/${obj.identifyingName}`;
        for (const v of Object.values(obj)) { const r = findBU(v); if (r) return r; }
        return null;
      }
      const found = findBU(data);
      if (found) return found;
    }
    const $ = cheerio.load(html);
    const href = $('a[href*="/review/"]').first().attr("href");
    if (href) return `https://fr.trustpilot.com${href.startsWith("/") ? href : "/" + href}`;
  } catch { /* ignore */ }
  return null;
}

async function findPagesJaunes(company: string): Promise<string | null> {
  try {
    const url = `https://www.pagesjaunes.fr/annuaire/chercherlp?quoiqui=${encodeURIComponent(company)}&ou=France`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const selectors = [
      "a.bi-denomination", ".bi-bloc-nom a",
      'a[href*="/pros/"]', "[class*='denomination'] a",
    ];
    for (const sel of selectors) {
      const href = $(sel).first().attr("href");
      if (href) return href.startsWith("http") ? href : `https://www.pagesjaunes.fr${href}`;
    }
  } catch { /* ignore */ }
  return null;
}

async function findYelp(company: string): Promise<string | null> {
  try {
    const url = `https://www.yelp.fr/search?find_desc=${encodeURIComponent(company)}&find_loc=France`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const href = $('[class*="businessName"] a, a[href*="/biz/"]').first().attr("href");
    if (href) return href.startsWith("http") ? href : `https://www.yelp.fr${href}`;
  } catch { /* ignore */ }
  return null;
}

async function findTripAdvisor(company: string): Promise<string | null> {
  try {
    const url = `https://www.tripadvisor.fr/Search?q=${encodeURIComponent(company)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const href = $(
      '[class*="result-title"] a, a[href*="/Restaurant_Review-"], a[href*="/Hotel_Review-"], a[href*="/Attraction_Review-"]'
    ).first().attr("href");
    if (href) return href.startsWith("http") ? href : `https://www.tripadvisor.fr${href}`;
  } catch { /* ignore */ }
  return null;
}

async function findCustplace(company: string): Promise<string | null> {
  try {
    const url = `https://www.custplace.com/search?q=${encodeURIComponent(company)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const href = $('a[href*="/avis/"], a[href*="/marque/"], [class*="brand-link"]').first().attr("href");
    if (href) return href.startsWith("http") ? href : `https://www.custplace.com${href}`;
  } catch { /* ignore */ }
  return null;
}

async function findAvisVerifies(company: string): Promise<string | null> {
  try {
    const url = `https://www.avis-verifies.com/recherche-marque?search=${encodeURIComponent(company)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const href = $(
      'a[href*="/avis-clients/"], [class*="brand-result"] a, [class*="company-link"] a'
    ).first().attr("href");
    if (href) return href.startsWith("http") ? href : `https://www.avis-verifies.com${href}`;
  } catch { /* ignore */ }
  return null;
}

async function findOpineon(company: string): Promise<string | null> {
  try {
    const url = `https://www.opineo.fr/recherche?q=${encodeURIComponent(company)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const href = $('a[href*="/avis/"], [class*="shop-link"]').first().attr("href");
    if (href) return href.startsWith("http") ? href : `https://www.opineo.fr${href}`;
  } catch { /* ignore */ }
  return null;
}

async function findIndeed(company: string): Promise<string | null> {
  try {
    const url = `https://fr.indeed.com/cmp/${encodeURIComponent(company.replace(/\s+/g, "-").toLowerCase())}/reviews`;
    const html = await fetchHtml(url);
    if (html.length > 5000 && !html.includes("Page introuvable")) return url;
  } catch { /* ignore */ }
  return null;
}

async function findGlassdoor(company: string): Promise<string | null> {
  try {
    const url = `https://www.glassdoor.fr/Avis/${encodeURIComponent(company.replace(/\s+/g, "-").toLowerCase())}-avis-SRCH_KE0,${company.length}.htm`;
    const html = await fetchHtml(url);
    if (html.length > 5000 && !html.includes("Page introuvable")) return url;
    // Fallback: search page
    const searchUrl = `https://www.glassdoor.fr/Reviews/company-reviews.htm?typedKeyword=${encodeURIComponent(company)}&sc.keyword=${encodeURIComponent(company)}`;
    const searchHtml = await fetchHtml(searchUrl);
    const $ = cheerio.load(searchHtml);
    const href = $('a[href*="-Avis-"], a[href*="-Reviews-"]').first().attr("href");
    if (href) return href.startsWith("http") ? href : `https://www.glassdoor.fr${href}`;
  } catch { /* ignore */ }
  return null;
}

// Découverte multi-plateformes (toutes en parallèle)
async function discoverReviewUrls(company: string): Promise<{ url: string; platform: string }[]> {
  const settled = await Promise.allSettled([
    findTrustpilot(company).then(u => u ? { url: u, platform: "Trustpilot" } : null),
    findPagesJaunes(company).then(u => u ? { url: u, platform: "Pages Jaunes" } : null),
    findYelp(company).then(u => u ? { url: u, platform: "Yelp" } : null),
    findTripAdvisor(company).then(u => u ? { url: u, platform: "TripAdvisor" } : null),
    findCustplace(company).then(u => u ? { url: u, platform: "Custplace" } : null),
    findAvisVerifies(company).then(u => u ? { url: u, platform: "Avis Vérifiés" } : null),
    findOpineon(company).then(u => u ? { url: u, platform: "Opineo" } : null),
    findIndeed(company).then(u => u ? { url: u, platform: "Indeed" } : null),
    findGlassdoor(company).then(u => u ? { url: u, platform: "Glassdoor" } : null),
  ]);
  return settled
    .filter(r => r.status === "fulfilled" && r.value !== null)
    .map(r => (r as PromiseFulfilledResult<{ url: string; platform: string }>).value);
}

// ── Pagination ────────────────────────────────────────────────

// Pages max par plateforme — certains sites ont des milliers de pages
const MAX_PAGES_BY_SITE: Partial<Record<SiteKey, number>> = {
  trustpilot:   50,
  tripadvisor:  40,
  amazon:       30,
  booking:      30,
  yelp:         25,
  pagesjaunes:  20,
  avisverifies: 40,
  custplace:    40,
  opineo:       30,
  indeed:       25,
  glassdoor:    25,
  fnac:         20,
  cdiscount:    20,
  darty:        15,
  ekomi:        30,
  societe:      15,
  software:     15,
  generic:      10,
};

const BATCH_SIZE = 5;
const PAGE_DELAY = 600;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function getMaxPages(site: SiteKey): number {
  return MAX_PAGES_BY_SITE[site] ?? 10;
}

function extractItemsFromHtml(html: string, site: SiteKey): RawItem[] {
  const $full  = cheerio.load(html);
  const $clean = cheerio.load(html);
  $clean("script, style, noscript, nav, footer, header, [aria-hidden='true'], .cookie-banner, #cookie-banner").remove();

  let items: RawItem[] = extractJsonLd($full);
  if (items.length < 2) items = extractNextData(html);
  if (items.length < 2) {
    switch (site) {
      case "trustpilot":   items = parseTrustpilot($clean); break;
      case "tripadvisor":  items = parseTripAdvisor($clean); break;
      case "amazon":       items = parseAmazon($clean); break;
      case "booking":      items = parseBooking($clean); break;
      case "yelp":         items = parseYelp($clean); break;
      case "pagesjaunes":  items = parsePagesJaunes($clean); break;
      case "appstore":     items = parseAppStore($clean); break;
      case "googleplay":   items = parseGooglePlay($clean); break;
      case "avisverifies": items = parseAvisVerifies($clean); break;
      case "custplace":    items = parseCustplace($clean); break;
      case "opineo":       items = parseOpineon($clean); break;
      case "indeed":       items = parseIndeed($clean); break;
      case "glassdoor":    items = parseGlassdoor($clean); break;
      case "fnac":         items = parseFnac($clean); break;
      case "cdiscount":    items = parseCdiscount($clean); break;
      case "darty":        items = parseDarty($clean); break;
      case "ekomi":        items = parseEkomi($clean); break;
      case "societe":      items = parseSociete($clean); break;
      case "software":     items = parseSoftwareReview($clean); break;
      default:             items = parseGeneric($clean); break;
    }
  }
  // Only fall back to generic if we found nothing — no generic <p> catch-all
  if (items.length < 2) items = parseGeneric($clean);
  return items;
}

function detectTotalPages(html: string, baseUrl: string, site: SiteKey): number {
  const maxPages = getMaxPages(site);
  try {
    if (site === "trustpilot") {
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (m) {
        const data = JSON.parse(m[1]);
        function findPageCount(o: unknown): number | null {
          if (!o || typeof o !== "object") return null;
          if (Array.isArray(o)) { for (const i of o) { const r = findPageCount(i); if (r) return r; } return null; }
          const obj = o as Record<string, unknown>;
          for (const k of ["pageCount", "totalPages", "pages", "lastPage"]) {
            if (typeof obj[k] === "number" && (obj[k] as number) > 0) return obj[k] as number;
          }
          for (const v of Object.values(obj)) { const r = findPageCount(v); if (r) return r; }
          return null;
        }
        const total = findPageCount(data);
        if (total) return Math.min(total, maxPages);
      }
    }

    if (site === "amazon") {
      const $ = cheerio.load(html);
      let max = 1;
      $("[data-page], .page-button, [aria-label*='Page'], a[href*='pageNumber=']").each((_, el) => {
        const txt = $(el).text().trim();
        const n = parseInt(txt);
        if (!isNaN(n) && n > max) max = n;
        const hm = ($(el).attr("href") || "").match(/pageNumber=(\d+)/);
        if (hm && parseInt(hm[1]) > max) max = parseInt(hm[1]);
      });
      return Math.min(max, maxPages);
    }

    if (site === "yelp") {
      const $ = cheerio.load(html);
      const txt = $('[class*="reviewCount"], [class*="review-count"]').first().text();
      const n = parseInt(txt.replace(/\D/g, ""));
      if (n > 0) return Math.min(Math.ceil(n / 20), maxPages);
    }

    if (site === "tripadvisor") {
      const $ = cheerio.load(html);
      let maxOffset = 0;
      $("a[href]").each((_, el) => {
        const m = ($(el).attr("href") || "").match(/-or(\d+)-/);
        if (m && parseInt(m[1]) > maxOffset) maxOffset = parseInt(m[1]);
      });
      const totalTxt = $('[class*="reviewCount"]').first().text();
      const total = parseInt(totalTxt.replace(/\D/g,""));
      if (total > 0) maxOffset = Math.max(maxOffset, (Math.min(Math.ceil(total / 10), maxPages) - 1) * 10);
      if (maxOffset > 0) return Math.min(Math.ceil(maxOffset / 10) + 1, maxPages);
    }

    if (site === "avisverifies" || site === "custplace" || site === "opineo" ||
        site === "indeed" || site === "glassdoor" || site === "ekomi") {
      const $ = cheerio.load(html);
      // Try to find total review count to estimate pages
      const countSelectors = [
        '[class*="review-count"]', '[class*="reviewCount"]',
        '[class*="total-reviews"]', '[class*="avis-count"]',
        'span[class*="count"]',
      ];
      for (const sel of countSelectors) {
        const txt = $(sel).first().text().replace(/\D/g, "");
        const n = parseInt(txt);
        if (n > 0) {
          const perPage = site === "glassdoor" ? 10 : site === "indeed" ? 20 : 15;
          return Math.min(Math.ceil(n / perPage), maxPages);
        }
      }
      // Check for explicit pagination links
      let pageMax = 1;
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        const m = href.match(/[?&](page|p|pg)=(\d+)/i) ||
                  href.match(/\/page\/(\d+)/i) ||
                  href.match(/\/p(\d+)\//i);
        if (m) {
          const n = parseInt(m[m.length - 1]);
          if (!isNaN(n) && n > pageMax) pageMax = n;
        }
      });
      return Math.min(pageMax, maxPages);
    }

    // Generic: look for ?page= or /page/ patterns
    const $ = cheerio.load(html);
    let pageMax = 1;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/[?&](?:page|p|pg)=(\d+)/i) || href.match(/\/page\/(\d+)/i);
      if (m) {
        const n = parseInt(m[1]);
        if (n > pageMax) pageMax = n;
      }
    });
    return Math.min(pageMax, maxPages);

  } catch { return 1; }
}

function buildPageUrl(baseUrl: string, page: number, site: SiteKey, firstHtml: string): string | null {
  try {
    const urlObj = new URL(baseUrl);

    if (site === "trustpilot") {
      urlObj.searchParams.set("page", String(page));
      return urlObj.toString();
    }
    if (site === "amazon") {
      urlObj.searchParams.set("pageNumber", String(page));
      return urlObj.toString();
    }
    if (site === "yelp") {
      urlObj.searchParams.set("start", String((page - 1) * 20));
      return urlObj.toString();
    }
    if (site === "booking" || site === "pagesjaunes" || site === "custplace" ||
        site === "avisverifies" || site === "ekomi" || site === "societe") {
      urlObj.searchParams.set("page", String(page));
      return urlObj.toString();
    }
    if (site === "tripadvisor") {
      const offset = (page - 1) * 10;
      const base = baseUrl.split("?")[0];
      const alreadyOr = base.match(/-or\d+-/);
      if (alreadyOr) return base.replace(/-or\d+-/, `-or${offset}-`);
      return base.replace(/(-Reviews)(-)/i, `$1-or${offset}$2`);
    }
    if (site === "indeed") {
      urlObj.searchParams.set("start", String((page - 1) * 20));
      return urlObj.toString();
    }
    if (site === "glassdoor") {
      // Glassdoor uses page number in URL path: _P2.htm
      const base = baseUrl.split("?")[0];
      const pagePattern = base.match(/_P(\d+)\.htm/i);
      if (pagePattern) return base.replace(/_P\d+\.htm/i, `_P${page}.htm`);
      return base.replace(/\.htm$/i, `_P${page}.htm`);
    }
    if (site === "opineo") {
      urlObj.searchParams.set("page", String(page));
      return urlObj.toString();
    }
    if (site === "fnac" || site === "cdiscount" || site === "darty") {
      urlObj.searchParams.set("page", String(page));
      return urlObj.toString();
    }

    // Generic: detect param from first page
    const existingParam = baseUrl.match(/[?&](page|p|pg)=(\d+)/i)?.[1];
    if (existingParam) {
      urlObj.searchParams.set(existingParam, String(page));
      return urlObj.toString();
    }
    // Detect from /page/N/ pattern
    if (baseUrl.match(/\/page\/\d+/i)) {
      return baseUrl.replace(/\/page\/\d+/i, `/page/${page}`);
    }
    // Try to guess from first page links
    const $ = cheerio.load(firstHtml);
    let guessedParam = "page";
    $("a[href]").each((_, el) => {
      const m = ($(el).attr("href") || "").match(/[?&](page|p|pg|offset)=(\d+)/i);
      if (m) { guessedParam = m[1]; return false; }
    });
    urlObj.searchParams.set(guessedParam, String(page));
    return urlObj.toString();
  } catch { return null; }
}

// ── Main scraper (avec pagination complète) ───────────────────

async function scrapeOne(url: string): Promise<SourceResult> {
  const source = hostLabel(url);
  const site   = detectSite(url);
  const emptyResult = (error: string): SourceResult => ({
    url, reviews: [], error, counts: { total: 0, positive: 0, negative: 0, neutral: 0, averageScore: 0 },
  });

  let firstHtml: string;
  try {
    firstHtml = await fetchHtml(url);
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err) && err.response
      ? `Erreur HTTP ${err.response.status}`
      : "Impossible d'accéder à la page (timeout ou accès refusé).";
    return emptyResult(msg);
  }

  const allItems: RawItem[] = extractItemsFromHtml(firstHtml, site);
  const totalPages = detectTotalPages(firstHtml, url, site);

  if (totalPages > 1) {
    const pageUrls: string[] = [];
    for (let p = 2; p <= totalPages; p++) {
      const pageUrl = buildPageUrl(url, p, site, firstHtml);
      if (pageUrl) pageUrls.push(pageUrl);
    }

    for (let i = 0; i < pageUrls.length; i += BATCH_SIZE) {
      const batch = pageUrls.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (pUrl) => {
          try {
            const html = await fetchHtml(pUrl);
            return extractItemsFromHtml(html, site);
          } catch { return []; }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") allItems.push(...r.value);
      }
      if (i + BATCH_SIZE < pageUrls.length) await sleep(PAGE_DELAY);
    }
  }

  const items = dedup(allItems);

  if (items.length === 0) {
    return emptyResult(
      "Aucun avis trouvé — ce site utilise probablement du JavaScript dynamique."
    );
  }

  const reviews: Review[] = items.map((item) => {
    const result = sentiment.analyze(item.text, { language: "fr" });
    return {
      text: item.text,
      rating: item.rating,
      sentiment: classifySentiment(result.score),
      score: result.score,
      source,
    };
  });

  const positive = reviews.filter((r) => r.sentiment === "positive").length;
  const negative = reviews.filter((r) => r.sentiment === "negative").length;
  const neutral  = reviews.filter((r) => r.sentiment === "neutral").length;
  const averageScore = reviews.reduce((s, r) => s + r.score, 0) / reviews.length;

  return {
    url,
    reviews,
    counts: {
      total: reviews.length, positive, negative, neutral,
      averageScore: Math.round(averageScore * 100) / 100,
    },
  };
}

// ── POST handler ──────────────────────────────────────────────

export async function POST(request: Request) {
  let inputs: string[];

  try {
    const body = await request.json();
    const raw: unknown = body.urls;
    if (!Array.isArray(raw) || raw.length === 0) {
      return Response.json({ error: "Fournissez au moins une URL ou un nom d'entreprise." }, { status: 400 });
    }
    inputs = (raw as unknown[]).map((u) => String(u).trim()).filter(Boolean);
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (inputs.length > 10) {
    return Response.json({ error: "Maximum 10 entrées à la fois." }, { status: 400 });
  }

  const resolvedUrls: string[] = [];
  const notFound: string[] = [];

  for (const input of inputs) {
    if (isLikelyUrl(input)) {
      try {
        const normalized = normalizeUrl(input);
        const parsed = new URL(normalized);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return Response.json({ error: `Protocole non supporté : ${input}` }, { status: 400 });
        }
        resolvedUrls.push(normalized);
      } catch {
        return Response.json({ error: `URL invalide : ${input}` }, { status: 400 });
      }
    } else {
      const discovered = await discoverReviewUrls(input);
      if (discovered.length > 0) {
        resolvedUrls.push(...discovered.map(d => d.url));
      } else {
        notFound.push(input);
      }
    }
  }

  if (resolvedUrls.length === 0) {
    return Response.json({
      error: `Aucune page d'avis trouvée pour : ${notFound.join(", ")}. Essayez d'entrer l'URL directement.`,
    }, { status: 404 });
  }

  const sources = await Promise.all(resolvedUrls.map(scrapeOne));
  const allReviews = sources.flatMap((s) => s.reviews);
  const total    = allReviews.length;
  const positive = allReviews.filter((r) => r.sentiment === "positive").length;
  const negative = allReviews.filter((r) => r.sentiment === "negative").length;
  const neutral  = allReviews.filter((r) => r.sentiment === "neutral").length;
  const averageScore = total > 0
    ? Math.round((allReviews.reduce((s, r) => s + r.score, 0) / total) * 100) / 100
    : 0;

  return Response.json({
    sources,
    aggregated: { total, positive, negative, neutral, averageScore },
    allReviews,
  } satisfies ScrapeResult);
}
