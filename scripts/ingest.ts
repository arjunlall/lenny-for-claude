/**
 * Ingestion script for processing Lenny's Podcast transcripts
 *
 * Usage:
 *   npm run ingest:sample   # Process 3 sample transcripts
 *   npm run ingest          # Process all transcripts (resumable)
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import type { AdviceChunk, AdviceIndex, Topic } from "../src/types.js";
import { TOPICS } from "../src/types.js";

const TRANSCRIPTS_DIR = path.join(process.cwd(), "transcripts");
const OUTPUT_FILE = path.join(process.cwd(), "data", "advice-index.json");

// Model selection - Haiku 4.5 is 3x cheaper and sufficient for extraction
const MODEL = process.env.INGEST_MODEL || "claude-haiku-4-5-20251001";

// Sample transcripts for prototyping
const SAMPLE_TRANSCRIPTS = [
  "Ami Vora.txt",
  "Shreyas Doshi.txt",
  "Lenny Rachitsky.txt",
];

interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

interface ExtractionResult {
  hasAdvice: boolean;
  topics: Topic[];
  insight: string;
  quote: string;
  context: string;
}

/**
 * Load existing index to support resume
 */
function loadExistingIndex(): { chunks: AdviceChunk[]; processedGuests: Set<string> } {
  if (!fs.existsSync(OUTPUT_FILE)) {
    return { chunks: [], processedGuests: new Set() };
  }

  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8")) as AdviceIndex;
    const processedGuests = new Set(data.chunks.map((c) => c.guest));
    console.log(`Resuming: found ${data.chunks.length} existing chunks from ${processedGuests.size} guests`);
    return { chunks: data.chunks, processedGuests };
  } catch {
    return { chunks: [], processedGuests: new Set() };
  }
}

/**
 * Save index incrementally after each transcript
 */
function saveIndex(chunks: AdviceChunk[], transcriptCount: number): void {
  const index: AdviceIndex = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    transcriptCount,
    chunks,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
}

/**
 * Parse a transcript file into segments
 */
function parseTranscript(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const lines = content.split("\n");

  let currentSpeaker = "";
  let currentTimestamp = "";
  let currentText = "";

  for (const line of lines) {
    const speakerMatch = line.match(/^(.+?)\s*\((\d{2}:\d{2}:\d{2})\):?\s*$/);

    if (speakerMatch) {
      if (currentSpeaker && currentText.trim()) {
        segments.push({
          speaker: currentSpeaker,
          timestamp: currentTimestamp,
          text: currentText.trim(),
        });
      }

      currentSpeaker = speakerMatch[1].trim();
      currentTimestamp = speakerMatch[2];
      currentText = "";
    } else if (line.trim()) {
      currentText += " " + line.trim();
    }
  }

  if (currentSpeaker && currentText.trim()) {
    segments.push({
      speaker: currentSpeaker,
      timestamp: currentTimestamp,
      text: currentText.trim(),
    });
  }

  return segments;
}

/**
 * Chunk transcript into meaningful segments for extraction
 */
function chunkTranscript(
  segments: TranscriptSegment[],
  guestName: string
): { chunk: string; timestamp: string }[] {
  const chunks: { chunk: string; timestamp: string }[] = [];
  const CHUNK_TARGET_WORDS = 500;
  const CHUNK_MAX_WORDS = 800;

  let currentChunk = "";
  let currentTimestamp = "";
  let wordCount = 0;

  for (const segment of segments) {
    if (isAdSegment(segment)) {
      continue;
    }

    const segmentWords = segment.text.split(/\s+/).length;
    const segmentText = `${segment.speaker}: ${segment.text}\n\n`;

    if (wordCount > 0 && wordCount + segmentWords > CHUNK_MAX_WORDS) {
      if (currentChunk.trim()) {
        chunks.push({ chunk: currentChunk.trim(), timestamp: currentTimestamp });
      }
      currentChunk = "";
      currentTimestamp = "";
      wordCount = 0;
    }

    if (!currentTimestamp) {
      currentTimestamp = segment.timestamp;
    }

    currentChunk += segmentText;
    wordCount += segmentWords;

    if (
      wordCount >= CHUNK_TARGET_WORDS &&
      segment.speaker.toLowerCase().includes(guestName.toLowerCase().split(" ")[0])
    ) {
      chunks.push({ chunk: currentChunk.trim(), timestamp: currentTimestamp });
      currentChunk = "";
      currentTimestamp = "";
      wordCount = 0;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ chunk: currentChunk.trim(), timestamp: currentTimestamp });
  }

  return chunks;
}

/**
 * Detect advertisement segments to skip
 */
function isAdSegment(segment: TranscriptSegment): boolean {
  const adPatterns = [
    /this episode is brought to you by/i,
    /let me tell you about/i,
    /our sponsor/i,
    /sidebar\.com/i,
    /useanvil\.com/i,
    /sponsored by/i,
  ];

  return adPatterns.some((pattern) => pattern.test(segment.text));
}

/**
 * Use Claude to extract advice from a chunk
 */
async function extractAdvice(
  client: Anthropic,
  chunk: string,
  guestName: string,
  episodeName: string
): Promise<ExtractionResult | null> {
  const topicsList = TOPICS.join(", ");

  const prompt = `You are extracting product advice from a podcast transcript segment.

Guest: ${guestName}
Episode: ${episodeName}

Transcript segment:
---
${chunk}
---

Analyze this segment and extract any actionable product advice. If there's meaningful advice for product managers, founders, or tech leaders, extract it.

Available topics: ${topicsList}

Respond in JSON format:
{
  "hasAdvice": true/false,
  "topics": ["topic1", "topic2"],
  "insight": "1-2 sentence summary of the advice",
  "quote": "The most impactful direct quote (keep it concise, under 200 chars)",
  "context": "What question or situation prompted this advice"
}

If the segment is just small talk, introductions, ads, or doesn't contain actionable advice, return:
{"hasAdvice": false}

Important:
- Only extract genuine insights, not obvious statements
- The quote should be a direct excerpt from the transcript
- Topics must be from the provided list
- Be selective - not every segment has advice worth extracting`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("No JSON found in response");
      return null;
    }

    const result = JSON.parse(jsonMatch[0]) as ExtractionResult;

    if (result.hasAdvice && result.topics) {
      result.topics = result.topics.filter((t) =>
        TOPICS.includes(t as Topic)
      ) as Topic[];
    }

    return result;
  } catch (error) {
    console.error("Error extracting advice:", error);
    return null;
  }
}

/**
 * Process a single transcript file
 */
async function processTranscript(
  client: Anthropic,
  filePath: string
): Promise<AdviceChunk[]> {
  const fileName = path.basename(filePath, ".txt");
  const guestName = fileName;
  const content = fs.readFileSync(filePath, "utf-8");

  console.log(`\nProcessing: ${guestName}`);

  const segments = parseTranscript(content);
  console.log(`  Parsed ${segments.length} segments`);

  const chunks = chunkTranscript(segments, guestName);
  console.log(`  Created ${chunks.length} chunks`);

  const adviceChunks: AdviceChunk[] = [];
  let chunkIndex = 0;

  for (const { chunk, timestamp } of chunks) {
    chunkIndex++;
    process.stdout.write(`  Processing chunk ${chunkIndex}/${chunks.length}...`);

    const result = await extractAdvice(client, chunk, guestName, guestName);

    if (result?.hasAdvice) {
      const adviceChunk: AdviceChunk = {
        id: `${guestName.toLowerCase().replace(/\s+/g, "-")}-${chunkIndex}`,
        guest: guestName,
        episode: guestName,
        topics: result.topics,
        insight: result.insight,
        quote: result.quote,
        context: result.context,
        timestamp: timestamp,
      };
      adviceChunks.push(adviceChunk);
      console.log(` [ADVICE] ${result.topics.join(", ")}`);
    } else {
      console.log(" [skip]");
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`  Extracted ${adviceChunks.length} advice chunks`);
  return adviceChunks;
}

/**
 * Main ingestion function
 */
async function main() {
  const isSample = process.argv.includes("--sample");

  console.log("=".repeat(60));
  console.log("Lenny's Podcast Advice Ingestion");
  console.log("=".repeat(60));
  console.log(`Using model: ${MODEL}`);

  const client = new Anthropic();

  // Load existing progress for resume
  const { chunks: existingChunks, processedGuests } = loadExistingIndex();
  const allChunks: AdviceChunk[] = [...existingChunks];

  let transcriptFiles: string[];

  if (isSample) {
    console.log("\nRunning in SAMPLE mode (3 transcripts)");
    transcriptFiles = SAMPLE_TRANSCRIPTS.filter((f) =>
      fs.existsSync(path.join(TRANSCRIPTS_DIR, f))
    );

    if (transcriptFiles.length < 3) {
      const allFiles = fs
        .readdirSync(TRANSCRIPTS_DIR)
        .filter((f) => f.endsWith(".txt"));
      transcriptFiles = allFiles.slice(0, 3);
    }
  } else {
    console.log("\nProcessing ALL transcripts");
    transcriptFiles = fs
      .readdirSync(TRANSCRIPTS_DIR)
      .filter((f) => f.endsWith(".txt"));
  }

  console.log(`Found ${transcriptFiles.length} transcripts total`);

  // Filter out already processed
  const remainingFiles = transcriptFiles.filter(
    (f) => !processedGuests.has(path.basename(f, ".txt"))
  );
  console.log(`Remaining to process: ${remainingFiles.length}`);

  let processedCount = processedGuests.size;

  for (const file of remainingFiles) {
    const filePath = path.join(TRANSCRIPTS_DIR, file);
    const chunks = await processTranscript(client, filePath);
    allChunks.push(...chunks);
    processedCount++;

    // Save after each transcript for resume capability
    saveIndex(allChunks, processedCount);
    console.log(`  [SAVED] ${processedCount}/${transcriptFiles.length} transcripts`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Ingestion Complete");
  console.log("=".repeat(60));
  console.log(`Transcripts processed: ${processedCount}`);
  console.log(`Total advice chunks: ${allChunks.length}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // Topic distribution
  const topicCounts: Record<string, number> = {};
  for (const chunk of allChunks) {
    for (const topic of chunk.topics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }
  console.log("\nTopic distribution:");
  for (const [topic, count] of Object.entries(topicCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${topic}: ${count}`);
  }
}

main().catch(console.error);
