/**
 * AI Utility Functions
 *
 * Provides sentiment analysis, translation, and text generation
 * via Hugging Face Inference API.
 *
 * Models used:
 *   Sentiment  — distilbert-base-uncased-finetuned-sst-2-english
 *   Translation — Helsinki-NLP/opus-mt-mul-en  (multilingual → English)
 *   Generation  — facebook/bart-large-cnn (summarization)
 */

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY

// ─── Model endpoints ─────────────────────────────────────────────
const SENTIMENT_URL =
  "https://router.huggingface.co/hf-inference/models/distilbert/distilbert-base-uncased-finetuned-sst-2-english"

const TRANSLATION_URL =
  "https://router.huggingface.co/hf-inference/models/Helsinki-NLP/opus-mt-mul-en"

const GENERATION_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn"

// ─── Types ───────────────────────────────────────────────────────

export interface SentimentResult {
  label: "POSITIVE" | "NEGATIVE"
  score: number
}

export interface TranslationResult {
  translatedText: string
}

export interface GenerationResult {
  generatedText: string
}

// ─── Helpers ─────────────────────────────────────────────────────

async function hfPost(url: string, body: object): Promise<Response | null> {
  if (!HF_TOKEN) {
    console.warn("HUGGINGFACE_API_KEY not set — skipping AI call")
    return null
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error(`HF API error (${url}): ${res.status} ${res.statusText}`)
    return null
  }

  return res
}

// ─── Sentiment Analysis ──────────────────────────────────────────

/**
 * Classifies a single text as POSITIVE or NEGATIVE.
 * The model returns [[{label, score}, {label, score}]].
 */
export async function analyzeSentiment(
  text: string
): Promise<SentimentResult | null> {
  try {
    const res = await hfPost(SENTIMENT_URL, { inputs: text })
    if (!res) return null

    // Response shape: [[{label: "POSITIVE", score: 0.99}, {label: "NEGATIVE", score: 0.01}]]
    const data = await res.json()
    const labels: { label: string; score: number }[] = data?.[0]

    if (!Array.isArray(labels) || labels.length === 0) {
      console.error("Unexpected sentiment response:", data)
      return null
    }

    // Pick the label with highest score
    const best = labels.reduce((a, b) => (b.score > a.score ? b : a))
    return {
      label: best.label as "POSITIVE" | "NEGATIVE",
      score: best.score,
    }
  } catch (err) {
    console.error("Sentiment analysis error:", err)
    return null
  }
}

/**
 * Analyzes an array of texts and returns aggregate sentiment.
 * Returns overall label + per-text breakdown.
 */
export async function analyzeSentimentBatch(
  texts: string[]
): Promise<{
  overall: "positive" | "negative" | "mixed" | "neutral"
  positiveCount: number
  negativeCount: number
  totalAnalyzed: number
}> {
  if (texts.length === 0) {
    return { overall: "neutral", positiveCount: 0, negativeCount: 0, totalAnalyzed: 0 }
  }

  // HF inference supports batch inputs for text-classification
  try {
    const res = await hfPost(SENTIMENT_URL, { inputs: texts })
    if (!res) {
      return { overall: "neutral", positiveCount: 0, negativeCount: 0, totalAnalyzed: 0 }
    }

    const data = await res.json()

    // HF text-classification response shapes:
    //   Single input:  [[{label:"POSITIVE",score:0.99}, {label:"NEGATIVE",score:0.01}]]
    //   Batch inputs:  [[label1-inp1, label2-inp1, label1-inp2, label2-inp2, ...]]
    //   The outer array always has exactly one element containing all labels.
    //   Each input contributes 2 labels (POSITIVE & NEGATIVE), so we group in pairs.

    let positiveCount = 0
    let negativeCount = 0

    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      console.error("Unexpected sentiment batch response:", data)
      return { overall: "neutral", positiveCount: 0, negativeCount: 0, totalAnalyzed: 0 }
    }

    const allLabels: { label: string; score: number }[] = data[0]
    const labelsPerInput = 2 // POSITIVE + NEGATIVE

    for (let i = 0; i < allLabels.length; i += labelsPerInput) {
      const pair = allLabels.slice(i, i + labelsPerInput)
      if (pair.length === 0) continue

      const best = pair.reduce((a, b) => (b.score > a.score ? b : a))
      if (best.label === "POSITIVE") positiveCount++
      else negativeCount++
    }

    const total = positiveCount + negativeCount
    let overall: "positive" | "negative" | "mixed" | "neutral" = "neutral"

    if (total === 0) {
      overall = "neutral"
    } else if (positiveCount / total >= 0.65) {
      overall = "positive"
    } else if (negativeCount / total >= 0.65) {
      overall = "negative"
    } else {
      overall = "mixed"
    }

    return { overall, positiveCount, negativeCount, totalAnalyzed: total }
  } catch (err) {
    console.error("Batch sentiment error:", err)
    return { overall: "neutral", positiveCount: 0, negativeCount: 0, totalAnalyzed: 0 }
  }
}

// ─── Translation ─────────────────────────────────────────────────

/**
 * Translates text to English using Helsinki-NLP's multilingual model.
 * Returns the translated text, or null on failure.
 */
export async function translateToEnglish(
  text: string
): Promise<TranslationResult | null> {
  try {
    const res = await hfPost(TRANSLATION_URL, { inputs: text })
    if (!res) return null

    // Response shape: [{ translation_text: "..." }]
    const data = await res.json()

    if (Array.isArray(data) && data[0]?.translation_text) {
      return { translatedText: data[0].translation_text }
    }

    console.error("Unexpected translation response:", data)
    return null
  } catch (err) {
    console.error("Translation error:", err)
    return null
  }
}

// ─── Text Generation (Daily Digest) ─────────────────────────────

/**
 * Summarizes text using facebook/bart-large-cnn via HF inference API.
 *
 * We send a structured text block and receive a summary back.
 * This is used for the daily digest to summarize discussions, match results, etc.
 */
export async function generateText(prompt: string): Promise<GenerationResult | null> {
  try {
    const res = await hfPost(GENERATION_URL, {
      inputs: prompt,
      parameters: {
        max_length: 1024,
        min_length: 50,
      },
    })
    if (!res) return null

    // Response shape: [{ summary_text: "..." }]
    const data = await res.json()

    if (Array.isArray(data) && data[0]?.summary_text) {
      return { generatedText: data[0].summary_text.trim() }
    }

    // Fallback for text generation format
    if (Array.isArray(data) && data[0]?.generated_text) {
      return { generatedText: data[0].generated_text.trim() }
    }

    console.error("Unexpected generation response:", data)
    return null
  } catch (err) {
    console.error("Text generation error:", err)
    return null
  }
}
