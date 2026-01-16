import type { AdviceChunk, AdviceIndex, Topic, GetProductAdviceInput, GetProductAdviceOutput } from './types.js';
import { TOPICS } from './types.js';

/**
 * In-memory search index for advice chunks
 */
export class AdviceSearch {
  private chunks: AdviceChunk[] = [];
  private topicIndex: Map<Topic, AdviceChunk[]> = new Map();

  constructor(index: AdviceIndex) {
    this.chunks = index.chunks;
    this.buildTopicIndex();
  }

  private buildTopicIndex(): void {
    // Initialize empty arrays for each topic
    for (const topic of TOPICS) {
      this.topicIndex.set(topic, []);
    }

    // Index each chunk by its topics
    for (const chunk of this.chunks) {
      for (const topic of chunk.topics) {
        const existing = this.topicIndex.get(topic) || [];
        existing.push(chunk);
        this.topicIndex.set(topic, existing);
      }
    }
  }

  /**
   * Normalize a topic string to match our taxonomy
   */
  private normalizeTopic(input: string): Topic | null {
    const normalized = input.toLowerCase().trim().replace(/\s+/g, '-');

    // Direct match
    if (TOPICS.includes(normalized as Topic)) {
      return normalized as Topic;
    }

    // Common aliases
    const aliases: Record<string, Topic> = {
      'pmf': 'product-market-fit',
      'product market fit': 'product-market-fit',
      'kpis': 'metrics',
      'okrs': 'metrics',
      'north star': 'metrics',
      'team': 'hiring',
      'recruiting': 'hiring',
      'management': 'leadership',
      'prioritization': 'roadmap',
      'planning': 'roadmap',
      'monetization': 'pricing',
      'b2b': 'enterprise',
      'b2c': 'consumer',
      'marketplace': 'consumer',
      'ux': 'design',
      'user research': 'design',
      'experiments': 'analytics',
      'a/b testing': 'analytics',
      'shipping': 'execution',
      'speed': 'execution',
      'artificial intelligence': 'ai',
      'llm': 'ai',
      'llms': 'ai',
      'machine learning': 'ai',
      'fundraise': 'fundraising',
      'investors': 'fundraising',
      'vc': 'fundraising',
      'virality': 'growth',
      'acquisition': 'growth',
      'retention': 'growth',
    };

    if (aliases[normalized]) {
      return aliases[normalized];
    }

    return null;
  }

  /**
   * Search for advice matching the given topics
   */
  search(input: GetProductAdviceInput): GetProductAdviceOutput {
    const maxResults = input.maxResults ?? 5;

    // Normalize input topics
    const normalizedTopics: Topic[] = [];
    for (const topic of input.topics) {
      const normalized = this.normalizeTopic(topic);
      if (normalized && !normalizedTopics.includes(normalized)) {
        normalizedTopics.push(normalized);
      }
    }

    if (normalizedTopics.length === 0) {
      return {
        advice: [],
        topicsMatched: [],
        totalMatches: 0,
      };
    }

    // Collect chunks that match any of the topics
    const matchedChunks: Map<string, { chunk: AdviceChunk; score: number }> = new Map();

    for (const topic of normalizedTopics) {
      const chunks = this.topicIndex.get(topic) || [];
      for (const chunk of chunks) {
        const existing = matchedChunks.get(chunk.id);
        if (existing) {
          // Increment score for each matching topic
          existing.score += 1;
        } else {
          matchedChunks.set(chunk.id, { chunk, score: 1 });
        }
      }
    }

    // Sort by score (more matching topics = higher score)
    const sorted = Array.from(matchedChunks.values())
      .sort((a, b) => b.score - a.score);

    const totalMatches = sorted.length;
    const results = sorted.slice(0, maxResults).map(({ chunk }) => chunk);

    return {
      advice: results,
      topicsMatched: normalizedTopics,
      totalMatches,
    };
  }

  /**
   * Get stats about the index
   */
  getStats(): { totalChunks: number; chunksByTopic: Record<string, number> } {
    const chunksByTopic: Record<string, number> = {};
    for (const [topic, chunks] of this.topicIndex.entries()) {
      chunksByTopic[topic] = chunks.length;
    }
    return {
      totalChunks: this.chunks.length,
      chunksByTopic,
    };
  }
}
