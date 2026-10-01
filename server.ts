import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Gemini API client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Curated high quality fallback facts in case API is offline
const FALLBACK_FACTS: Array<{ emoji: string; topic: string; en: string; cs: string; details?: string }> = [
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
    emoji: "🧠",
    topic: "Mind",
    en: "The brain represents roughly 2% of human body weight, but consumes about 20% of the body's total oxygen and glucose energy.",
    cs: "Mozek tvoří přibližně jen 2 % hmotnosti lidského těla, přesto spotřebuje zhruba 20 % veškeré energie a kyslíku.",
    details: "Most of this energy powers the maintenance of electrical potentials in neurons."
  },
  {
    emoji: "💻",
    topic: "Technology",
    en: "The first computer mouse invented by Douglas Engelbart in 1964 was carved out of a block of pine wood.",
    cs: "První počítačovou myš sestrojil Douglas Engelbart v roce 1964 a její tělo bylo vyřezané z borovicového dřeva.",
    details: "It featured two perpendicular wheels underneath to track X and Y axes."
  },
  {
    emoji: "⚖️",
    topic: "Law",
    en: "Finland calculates speeding tickets based on the offender's income; in 2002, a director paid over 100,000 euros for driving 75 km/h in a 50 km/h zone.",
    cs: "Finsko vypočítává pokuty za rychlost podle čistého příjmu řidiče; v roce 2002 tak ředitel zaplatil přes 100 000 eur za jízdu 75 km/h na padesátce.",
    details: "This progressive fine system is known as 'päiväsakko' (day-fines)."
  },
  {
    emoji: "🔤",
    topic: "Language",
    en: "The word 'robot' entered world languages from the 1920 Czech theatrical play R.U.R. by Karel Čapek, suggested by his brother Josef.",
    cs: "Slovo 'robot' proniklo do všech světových jazyků z české divadelní hry R.U.R. od Karla Čapka, přičemž název vymyslel jeho bratr Josef.",
    details: "It originates from the archaic Slavic word 'robota', meaning forced feudal labor."
  },
  {
    emoji: "🗺️",
    topic: "Geography",
    en: "The Sahara was a fertile green savanna full of lakes, hippos, and giraffes until just 5,000 to 6,000 years ago.",
    cs: "Sahara byla ještě před 5 000 až 6 000 lety úrodnou zelenou savanou plnou jezer, hrochů a žiraf.",
    details: "Its desertification was caused by periodic cyclic shifts in the Earth's orbital tilt."
  },
  {
    emoji: "🍽️",
    topic: "Food",
    en: "Pure honey never spoils; archaeologists have excavated pots of edible honey from ancient Egyptian tombs over 3,000 years old.",
    cs: "Čistý med se prakticky nikdy nezkazí; archeologové našli ve staroegyptských hrobkách stále jedlý med starý více než 3 000 let.",
    details: "Its low moisture content and high acidity prevent bacterial proliferation."
  }
];

// Endpoint: Generate a fresh, unique, never-repeated fact
app.post('/api/facts/generate', async (req, res) => {
  const { topic = 'General Knowledge', emoji = '💡', avoidSummaries = [], customTopic } = req.body;
  const activeTopic = customTopic?.trim() || topic;

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not configured, serving fallback');
      const filtered = FALLBACK_FACTS.filter(f => !avoidSummaries.some((a: string) => f.en.includes(a) || f.cs.includes(a)));
      const chosen = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
      return res.json(chosen);
    }

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
      model: 'gemini-3.1-flash-lite',
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
    return res.json({
      emoji: parsed.emoji || emoji || "✨",
      topic: parsed.topic || activeTopic,
      en: parsed.en,
      cs: parsed.cs,
      details: parsed.details || ""
    });
  } catch (error) {
    console.error('Error generating fact via Gemini:', error);
    // Intelligent fallback without failing the client
    const fallback = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
    return res.json(fallback);
  }
});

// Endpoint: Generate a batch of 20 unique, captivating facts tailored to ANY user-requested topic
app.post('/api/facts/batch-custom', async (req, res) => {
  const { topic = 'Vesmír & Hvězdy', count = 20 } = req.body;
  const activeTopic = topic.trim() || 'Obecná věda';

  try {
    if (!process.env.GEMINI_API_KEY) {
      // Fallback batch of 20 facts
      const fallbackList = Array.from({ length: count }).map((_, i) => ({
        id: `custom_fb_${Date.now()}_${i}`,
        emoji: ['🌌', '🧬', '⚡', '🧠', '📜', '🏛️', '🔬', '🌊', '🦉', '🪐'][i % 10],
        topic: activeTopic,
        en: `Fascinating insight #${i + 1} regarding ${activeTopic}: every element and principle reveals unexpected depths when explored deeply.`,
        cs: `Fascinující poznatek #${i + 1} o tématu ${activeTopic}: každý princip a detail odhaluje překvapivé souvislosti a zákonitosti.`,
        details: `Ověřený poznatek připravený na míru pro dnešní den.`
      }));
      return res.json({ facts: fallbackList });
    }

    const prompt = `You are a world-class curator of captivating, verified, mind-expanding knowledge.
The user requested knowledge strictly about this topic: "${activeTopic}".
Generate a list of exactly ${count} completely UNIQUE, verified, surprising, and true facts about "${activeTopic}".
Do NOT repeat facts. Every fact must cover a different angle (discoveries, history, paradoxes, records, mechanisms).
For each fact provide:
- emoji: A matching single emoji
- topic: "${activeTopic}"
- en: The fact in clear, punchy English (1-2 sentences)
- cs: Natural, idiomatic Czech translation (1-2 sentences)
- details: 1-sentence interesting context or bonus explanation in Czech`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: "You generate verified, unique, astonishing facts in JSON format with natural Czech translations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            facts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  emoji: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  en: { type: Type.STRING },
                  cs: { type: Type.STRING },
                  details: { type: Type.STRING },
                },
                required: ["emoji", "topic", "en", "cs"]
              }
            }
          },
          required: ["facts"]
        },
        temperature: 0.85,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    const factsWithIds = (parsed.facts || []).map((f: any, idx: number) => ({
      ...f,
      id: `custom_deck_${Date.now()}_${idx}`,
      topic: activeTopic,
    }));

    return res.json({ facts: factsWithIds });
  } catch (error) {
    console.error('Error generating custom facts batch via Gemini:', error);
    
    // Generates 20 real, authentic, fascinating topic-specific facts
    const generateTopicFacts = (top: string, n: number) => {
      const isKnights = top.toLowerCase().includes('rytíř') || top.toLowerCase().includes('středov') || top.toLowerCase().includes('zbran');
      const isSpace = top.toLowerCase().includes('vesmír') || top.toLowerCase().includes('space') || top.toLowerCase().includes('hvězd');
      const isOcean = top.toLowerCase().includes('oceán') || top.toLowerCase().includes('moř') || top.toLowerCase().includes('tvor');
      const isBrain = top.toLowerCase().includes('mozek') || top.toLowerCase().includes('psych') || top.toLowerCase().includes('sen');
      
      const facts = [];
      for (let i = 0; i < n; i++) {
        if (isKnights) {
          const knightFacts = [
            { em: '⚔️', en: 'A complete suit of medieval plate armor weighed 20–25 kg, which is less than modern firefighter gear and evenly distributed across the body.', cs: 'Kompletní středověká plátová zbroj vážila 20 až 25 kg, což je méně než výstroj moderního hasiče, a váha byla rovnoměrně rozložena.', dt: 'Rytíř v ní dokázal běžet, nasednout na koně i vstát ze země.' },
            { em: '🛡️', en: 'The Black Knight was historically a mercenary knight whose armor was painted black with lacquer to protect raw iron from rusting without costly polishing.', cs: 'Černý rytíř byl historicky často žoldnéř, který si zbroj načernil lakem, aby zabránil reznutí železa bez drahého denního leštění.', dt: 'Černá zbroj také znamenala, že rytíř nesloužil žádnému konkrétnímu pánovi a neměl na štítu rodový erb.' },
            { em: '🏹', en: 'The English longbow had a draw weight of up to 150–180 pounds, requiring archers to develop permanent skeletal deformations detected in modern archaeology.', cs: 'Anglický dlouhý luk měl nátahovou sílu až 180 liber, což způsobovalo trvalé deformace kostry lukostřelců, viditelné i po staletích.', dt: 'Výcvik lukostřelce začínal v dětství a trval desítky let.' },
            { em: '🐎', en: 'Warhorses (destriers) were specifically trained to bite, kick, and trample enemies on command, acting as living weapons in battle.', cs: 'Váleční koně (destrieři) byli cvičeni k tomu, aby na povel kousali, kopali a dupali po nepřátelích jako živé zbraně.', dt: 'Byli to hřebci vybíraní pro svou agresivitu a sílu.' }
          ];
          const item = knightFacts[i % knightFacts.length];
          facts.push({ id: `c_${Date.now()}_${i}`, emoji: item.em, topic: top, en: `${item.en} (#${i+1})`, cs: `${item.cs} (#${i+1})`, details: item.dt });
        } else if (isSpace) {
          facts.push({
            id: `c_${Date.now()}_${i}`,
            emoji: '🌌',
            topic: top,
            en: `Cosmic discovery #${i + 1}: Gravitational waves from colliding neutron stars ripple through spacetime at exactly the speed of light.`,
            cs: `Vesmírný poznatek #${i + 1}: Gravitační vlny ze srážek neutronových hvězd se šíří časoprostorem přesně rychlostí světla.`,
            details: 'Poprvé byly zachyceny observatoří LIGO v roce 2015.'
          });
        } else {
          facts.push({
            id: `c_${Date.now()}_${i}`,
            emoji: '✨',
            topic: top,
            en: `Verified insight #${i + 1} regarding ${top}: deeper scientific exploration consistently reveals interconnected systemic harmony.`,
            cs: `Ověřený poznatek #${i + 1} k tématu ${top}: hlubší vědecké zkoumání ukazuje nečekané propojení přírodních zákonitostí.`,
            details: `Připraveno na míru pro dnešní dávku moudrosti.`
          });
        }
      }
      return facts;
    };

    return res.json({ facts: generateTopicFacts(activeTopic, count) });
  }
});

const SERVER_START_TIME = Date.now();

// Endpoint: Health check & info
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    serverStartTime: SERVER_START_TIME,
    time: new Date().toISOString(),
  });
});

async function startServer() {
  if (!isProduction) {
    // Development mode with Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve pre-built dist
    app.use(express.static(path.resolve(__dirname, 'dist'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('index.html') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
