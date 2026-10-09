import {
  evaluateRules,
  analyzeMessage,
  CognitiveShield,
  defaultShieldConfig,
  type RuleContext,
  type Rule,
  type RuleEvaluationResult,
  type MessageAnalysis,
  type ShieldedMessage,
} from '@p31ca/rules';
import { getConstitution } from './constitution';
import { getDB, getEmbeddingCorpusStats } from './db';
import { computeEmbeddingSafe } from './embeddingService';

export interface CognitiveGateInput {
  text: string;
  userId?: string;
  zoneId?: string;
  spoonBalance?: number;
  karma?: number;
}

export interface CognitiveGateResult {
  allowed: boolean;
  deniedBy?: Rule;
  warnings: string[];
  requiredAcknowledgments: string[];
  analysis: MessageAnalysis;
  shouldShield: boolean;
  shield: ShieldedMessage | null;
  similarCount?: number;
}

let _shield: CognitiveShield | null = null;

function getShield(): CognitiveShield {
  if (!_shield) {
    _shield = new CognitiveShield({
      ...defaultShieldConfig,
      webllmEnabled: false,
      ollamaEndpoint: '',
    });
  }
  return _shield;
}

// ── Semantic search via pgvector ──────────────────────────────────────────

export interface SimilarMessage {
  id: string;
  content: string;
  similarity: number;
}

let _embeddingReady = false;

async function ensureEmbeddingsTable(): Promise<void> {
  if (_embeddingReady) return;
  const db = await getDB();
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding FLOAT4[384] NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
      );
      CREATE INDEX IF NOT EXISTS idx_embeddings_cosine
        ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 16);
    `);
    _embeddingReady = true;
  } catch {
    // pgvector extension not loaded — embeddings table unavailable
  }
}

const MILESTONES = [100, 500, 1000] as const;
let _lastLoggedMilestone: number | null = null;

function logCorpusMilestone(count: number): void {
  if (_lastLoggedMilestone !== null && count <= _lastLoggedMilestone) return;
  const milestone = [...MILESTONES].reverse().find((m) => count >= m);
  if (milestone !== undefined && _lastLoggedMilestone !== milestone) {
    _lastLoggedMilestone = milestone;
    console.log(`[cognitiveGate] 🧠 Embedding corpus milestone: ${milestone} messages stored`);
  }
}

export async function storeMessageEmbedding(
  message: string,
  embedding: number[],
): Promise<string> {
  await ensureEmbeddingsTable();
  const id = `emb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const db = await getDB();
  const vec = `[${embedding.join(',')}]`;
  await db.query(
    `INSERT INTO embeddings (id, content, embedding, created_at) VALUES ($1, $2, $3::vector, $4)`,
    [id, message, vec, Date.now()],
  );

  try {
    const stats = await getEmbeddingCorpusStats();
    logCorpusMilestone(stats.total);
  } catch {
    // milestone check failed silently
  }

  return id;
}

export async function findSimilarMessages(
  queryEmbedding: number[],
  limit = 5,
): Promise<SimilarMessage[]> {
  await ensureEmbeddingsTable();
  const db = await getDB();
  const vec = `[${queryEmbedding.join(',')}]`;
  const res = await db.query<{ id: string; content: string; similarity: number }>(
    `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
     FROM embeddings
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vec, limit],
  );
  return res.rows;
}

export async function getCorpusStats(): Promise<{ total: number; avgLength?: number }> {
  try {
    const stats = await getEmbeddingCorpusStats();
    return {
      total: stats.total,
      avgLength: stats.avgLength,
    };
  } catch {
    return { total: 0 };
  }
}

export async function computeEmbedding(text: string): Promise<number[]> {
  const embedding = await computeEmbeddingSafe(text);
  return embedding ?? new Array(384).fill(0);
}

function buildSimilarContext(messages: SimilarMessage[]): string | null {
  if (messages.length === 0) return null;
  const lines = messages.map(
    (m, i) => `  [${i + 1}] (sim=${m.similarity.toFixed(3)}) ${m.content}`,
  );
  return `SIMILAR PAST MESSAGES (context for de-escalation — do not flag as new conflict):\n${lines.join('\n')}`;
}

function patchShieldPrompt(shield: CognitiveShield, similarContext: string): void {
  const originalBuildPrompt = (shield as any).buildPrompt.bind(shield);
  (shield as any).buildPrompt = function (text: string): string {
    const base = originalBuildPrompt(text);
    return `${base}\n\n${similarContext}`;
  };
}

export async function evaluateSend(input: CognitiveGateInput): Promise<CognitiveGateResult> {
  const ctx: RuleContext = {
    time: Date.now(),
    spoonBalance: input.spoonBalance ?? 0,
    karma: input.karma ?? 0,
    zoneEnergy: 'balanced',
    userId: input.userId ?? 'SYSTEM',
    zoneId: input.zoneId ?? 'commons',
    metadata: { message: input.text },
  };

  const rules: RuleEvaluationResult = evaluateRules(getConstitution(), ctx, ctx.zoneId);
  const analysis = analyzeMessage(input.text);

  // Find similar past messages for context
  let similarMessages: SimilarMessage[] = [];
  try {
    const queryEmbedding = await computeEmbedding(input.text);
    if (queryEmbedding.some((v) => v !== 0)) {
      similarMessages = await findSimilarMessages(queryEmbedding, 5);
      await storeMessageEmbedding(input.text, queryEmbedding);
    }
  } catch {
    // Embeddings not available yet — proceed without context
  }

  const similarContext = buildSimilarContext(similarMessages.slice(0, 3));
  const deniedBy = rules.allowed
    ? undefined
    : (rules.deniedBy ?? rules.matchedRules.find((r) => r.action.type === 'DENY'));
  const shouldShield = rules.allowed && (rules.transformations.length > 0 || analysis.conflictLevel !== 'SAFE');

  let shield: ShieldedMessage | null = null;
  if (shouldShield) {
    const shieldInstance = getShield();
    if (similarContext) {
      patchShieldPrompt(shieldInstance, similarContext);
    }
    shield = await shieldInstance.shieldMessage(input.text);
  }

  return {
    allowed: rules.allowed,
    deniedBy,
    warnings: rules.warnings,
    requiredAcknowledgments: rules.requiredAcknowledgments,
    analysis,
    shouldShield,
    shield,
    similarCount: similarMessages.length || undefined,
  };
}
