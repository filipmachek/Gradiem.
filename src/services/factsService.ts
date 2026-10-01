import { EarnedFact } from '../types';
import { INITIAL_FACT_POOL } from '../data/topicsAndFacts';

export async function fetchNewFact(
  topicName: string,
  emoji: string,
  seenFacts: EarnedFact[],
  customTopic?: string
): Promise<EarnedFact> {
  const activeTopic = customTopic?.trim() || topicName;
  const avoidSummaries = seenFacts.slice(-40).map(f => f.en || f.cs);

  try {
    const res = await fetch('/api/facts/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: activeTopic,
        emoji,
        avoidSummaries,
        customTopic,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.cs || data.en)) {
        return {
          id: 'fact_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          emoji: data.emoji || emoji || '💡',
          topic: data.topic || activeTopic,
          en: data.en || data.cs,
          cs: data.cs || data.en,
          details: data.details || '',
          earnedAt: new Date().toISOString(),
          source: 'gemini',
        };
      }
    }
  } catch (err) {
    console.warn('API fact generation unavailable, using local pool:', err);
  }

  // Fallback to local pool, avoiding seen facts
  const seenIds = new Set(seenFacts.map(f => f.en));
  const available = INITIAL_FACT_POOL.filter(f => !seenIds.has(f.en));
  const pool = available.length > 0 ? available : INITIAL_FACT_POOL;
  const item = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: 'fact_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    emoji: item.emoji,
    topic: item.topic,
    en: item.en,
    cs: item.cs,
    details: item.details,
    earnedAt: new Date().toISOString(),
    source: 'pool',
  };
}
