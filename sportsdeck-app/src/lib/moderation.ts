import { prisma } from "@/lib/prisma"

const HF_API_URL =
  "https://router.huggingface.co/hf-inference/models/unitary/toxic-bert"
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY
const TOXICITY_THRESHOLD = parseFloat(process.env.TOXICITY_THRESHOLD ?? "0.7")

/**
 * Shape returned by the HuggingFace text-classification pipeline
 * for `unitary/toxic-bert`.
 * Labels: toxic, severe_toxic, obscene, threat, insult, identity_hate, sexual_explicit
 *
 * The API returns [[{label, score}, …]] — an array-of-arrays.
 */
interface HFLabel {
  label: string
  score: number
}

export interface ModerationResult {
  flagged: boolean
  toxicityScore: number
  labels: { label: string; score: number }[]
  explanation: string
  model: string
}

/**
 * Calls the Hugging Face Inference API to analyze text for toxicity.
 * Returns a structured moderation result.
 *
 * If the API key is not set or the call fails, returns a non-flagged result
 * so the app degrades gracefully — content is still created, just not auto-flagged.
 */
export async function analyzeContent(text: string): Promise<ModerationResult> {
  const defaultResult: ModerationResult = {
    flagged: false,
    toxicityScore: 0,
    labels: [],
    explanation: "AI moderation unavailable",
    model: "unitary/toxic-bert",
  }

  if (!HF_TOKEN) {
    console.warn("HUGGINGFACE_API_KEY not set — skipping AI moderation")
    return defaultResult
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    })

    if (!response.ok) {
      console.error(`HF API error: ${response.status} ${response.statusText}`)
      return defaultResult
    }

    const data: HFLabel[][] = await response.json()

    // The model returns [[{label, score}, …]]
    const labels = data?.[0]
    if (!Array.isArray(labels)) {
      console.error("Unexpected HF response shape:", data)
      return defaultResult
    }

    // Find the overall toxicity score
    // unitary/toxic-bert: primary label is "toxic"; additional labels: threat, severe_toxic, insult, obscene
    const toxicityLabel = labels.find((l) => l.label === "toxic")
    const toxicityScore = toxicityLabel?.score ?? 0

    // Build a human-readable explanation from significant scores
    const significantLabels = labels
      .filter((l) => l.score > 0.3)
      .sort((a, b) => b.score - a.score)

    const explanation =
      significantLabels.length > 0
        ? significantLabels
            .map((l) => `${l.label}: ${(l.score * 100).toFixed(1)}%`)
            .join(", ")
        : "No significant toxicity detected"

    return {
      flagged: toxicityScore >= TOXICITY_THRESHOLD,
      toxicityScore,
      labels: labels.map((l) => ({ label: l.label, score: l.score })),
      explanation,
      model: "unitary/toxic-bert",
    }
  } catch (error) {
    console.error("AI moderation error:", error)
    return defaultResult
  }
}

/**
 * Runs moderation on content and, if flagged, auto-creates a ReportedItem
 * with source = "AI" so it appears in the admin review queue.
 *
 * Called asynchronously after post/reply creation — does not block the response.
 *
 * @param contentType  "THREAD" | "POST" | "REPLY"
 * @param contentId    The id of the created content
 * @param text         The text to analyze
 */
export async function moderateContent(
  contentType: string,
  contentId: string,
  text: string
): Promise<void> {
  try {
    const result = await analyzeContent(text)

    console.log(
      `[moderation] ${contentType}:${contentId} — toxic=${result.toxicityScore.toFixed(4)} flagged=${result.flagged} threshold=${TOXICITY_THRESHOLD} labels=${JSON.stringify(result.labels)}`
    )

    // Always update AI verdict on an existing ReportedItem (e.g. user-reported content).
    // Only CREATE a new ReportedItem automatically when the content is actually flagged.
    const existing = await prisma.reportedItem.findUnique({
      where: { contentType_contentId: { contentType, contentId } },
    })

    const aiData = {
      aiScore: result.toxicityScore,
      aiLabel: result.labels
        .filter((l) => l.score > 0.3)
        .map((l) => l.label)
        .join(", ") || "none",
      aiExplanation: result.explanation,
      aiModel: result.model,
      aiUpdatedAt: new Date(),
    }

    if (existing) {
      // Update verdict on already-reported item regardless of threshold
      await prisma.reportedItem.update({
        where: { contentType_contentId: { contentType, contentId } },
        data: aiData,
      })
    } else if (result.flagged) {
      // Auto-create only when AI actually flags it
      await prisma.reportedItem.create({
        data: {
          contentType,
          contentId,
          reportCount: 0,
          status: "pending",
          ...aiData,
        },
      })
      console.log(`[moderation] AUTO-FLAGGED ${contentType}:${contentId}`)
    }
  } catch (error) {
    console.error(`[moderation] Error for ${contentType}:${contentId}:`, error)
  }
}
