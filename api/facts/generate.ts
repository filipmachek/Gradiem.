import { GoogleGenAI, Type } from '@google/genai';

interface FactResponse {
  emoji: string;
  topic: string;
  en: string;
  cs: string;
  details?: string;
}

const FALLBACK_FACTS: FactResponse[] = [
  {
    emoji: "🦉",
    topic: "Nature",
    en: "The mantis shrimp's eyes hold up to 16 photoreceptor types, sensing wavelengths humans can't even name.",
    cs: "Oči kudlankotva mají až 16 typů fotoreceptorů a vnímají vlnové délky, pro které lidé nemají ani název.",
    details: "Mantis shrimps can also detect circularly polarized light."
  },
  {
    emoji: "🦉",
    topic: "Nature",
    en: "Octopuses can edit their own RNA to fine-tune neurons for cold water, a trick almost no other animal uses.",
    cs: "Chobotnice dokážou upravovat vlastní RNA a doladit tak neurony pro studenou vodu — trik, který téměř žádné jiné zvíře nemá.",
    details: "This allows them to adapt quickly to rapid ocean temperature fluctuations."
  },
  {
    emoji: "📜",
    topic: "History",
    en: "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid of Giza.",
    cs: "Kleopatra žila časově blíže přistání člověka na Měsíci než stavbě Velké pyramidy v Gíze.",
    details: "The pyramids were built around 2500 BC, while Cleopatra lived around 30 BC."
  },
  {
    emoji: "🌌",
    topic: "Space",
    en: "A day on Venus is longer than its year: Venus takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun.",
    cs: "Den na Venuši trvá déle než její rok: Venuše se kolem své osy otočí za 243 pozemských dní, ale Slunce oběhne za 225 dní.",
    details: "Venus also rotates in the opposite direction compared to most planets."
  },
  {
    emoji: "🧬",
    topic: "Biology",
    en: "Tardigrades can survive being frozen to nearly absolute zero, exposed to the vacuum of space, and bombarded with lethal radiation.",
    cs: "Želvušky dokážou přežít zmrazení téměř k absolutní nule, pobyt ve vakuu vesmíru i dávky smrtícího záření.",
    details: "They enter cryptobiosis by reducing their body water content below 1%."
  },
  {
    emoji: "💻",
    topic: "Technology",
    en: "The first computer mouse invented by Douglas Engelbart in 1964 was carved out of a block of pine wood.",
    cs: "První počítačovou myš sestrojil Douglas Engelbart v roce 1964 a její tělo bylo vyřezané z borovicového dřeva.",
    details: "It featured two perpendicular wheels underneath to track X and Y axes."
  }
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { topic = 'General Knowledge', emoji = '💡', avoidSummaries = [], customTopic } = body;
  const activeTopic = customTopic?.trim() || topic;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const filtered = FALLBACK_FACTS.filter(f => !avoidSummaries.some((a: string) => f.en.includes(a) || f.cs.includes(a)));
    const chosen = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : FALLBACK_FACTS[0];
    return res.status(200).json(chosen);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const avoidText = Array.isArray(avoidSummaries) && avoidSummaries.length > 0
      ? `\nIMPORTANT: Do NOT repeat or closely resemble any of these already seen facts:\n${avoidSummaries.slice(-30).map((s: string) => `- ${s}`).join('\n')}\n`
      : '';

    const prompt = `You are a world-class curator of captivating, verified, awe-inspiring knowledge.
Generate EXACTLY ONE fascinating, surprising, and true fact about "${activeTopic}".
It must NOT be cliché or common knowledge (do not give generic trivia). Choose something unexpected, verified by science or history.
${avoidText}
Provide:
1. The fact in clear, engaging English (1-2 sentences).
2. An authentic, idiomatic, natural Czech translation of the fact (1-2 sentences).
3. A 1-sentence interesting context or bonus detail in Czech.
4. A matching single emoji for this specific fact.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You generate verified, unique, astonishing facts in JSON format with English and natural Czech translations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emoji: { type: Type.STRING, description: "A single representative emoji" },
            topic: { type: Type.STRING, description: "The topic name" },
            en: { type: Type.STRING, description: "The fact in English (1-2 punchy sentences)" },
            cs: { type: Type.STRING, description: "The fact translated naturally to Czech" },
            details: { type: Type.STRING, description: "A brief bonus context or explanation in Czech" }
          },
          required: ["emoji", "topic", "en", "cs"]
        },
        temperature: 0.85,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Fact generation error on Vercel:', error);
    const fallback = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
    return res.status(200).json(fallback);
  }
}
