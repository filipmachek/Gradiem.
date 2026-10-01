import { TopicDefinition } from '../types';

export const TOPICS: TopicDefinition[] = [
  { emoji: "🦉", id: "nature", name: "Nature", description: "Wildlife, plants, and natural wonders" },
  { emoji: "📜", id: "history", name: "History", description: "Ancient civilizations and milestones" },
  { emoji: "⚖️", id: "law", name: "Law", description: "Legal history and unique jurisprudence" },
  { emoji: "🔤", id: "language", name: "Language", description: "Linguistics, etymology, and alphabets" },
  { emoji: "🌌", id: "space", name: "Space", description: "Cosmos, planets, and astrophysics" },
  { emoji: "🧬", id: "biology", name: "Biology", description: "Genetics, cellular life, and organism facts" },
  { emoji: "🧠", id: "mind", name: "Mind", description: "Psychology, cognition, and neuroscience" },
  { emoji: "💻", id: "tech", name: "Technology", description: "Computing history and breakthroughs" },
  { emoji: "🗺️", id: "geo", name: "Geography", description: "Remarkable earth locations and borders" },
  { emoji: "🍽️", id: "food", name: "Food", description: "Culinary history and food science" }
];

export const INITIAL_FACT_POOL: Array<{ emoji: string; topic: string; en: string; cs: string; details?: string }> = [
  {
    emoji: "🦉",
    topic: "Nature & Wildlife",
    en: "The mantis shrimp can punch with the acceleration of a .22 caliber bullet, boiling the water around its claws in microseconds.",
    cs: "Kudlankotv dokáže udeřit se zrychlením kulky ráže .22, což v mikrosekundách přivede vodu kolem jeho klepeta k varu.",
    details: "The shockwave generates a flash of light and temperatures comparable to the surface of the sun."
  },
  {
    emoji: "🦉",
    topic: "Nature & Wildlife",
    en: "Octopuses have three hearts and blue blood based on copper rather than iron.",
    cs: "Chobotnice mají tři srdce a modrou krev založenou na mědi (hemocyaninu) místo na železe.",
    details: "Two hearts pump blood to the gills, while the third supplies the rest of the body."
  },
  {
    emoji: "🦉",
    topic: "Nature & Wildlife",
    en: "Crows can recognize individual human faces and remember who treated them well or poorly for years.",
    cs: "Vrány dokáží rozeznat jednotlivé lidské tváře a po celá léta si pamatovat, kdo se k nim choval dobře či zle.",
    details: "They can even pass this knowledge on to other members of their flock."
  },
  {
    emoji: "📜",
    topic: "History & Civilization",
    en: "Oxford University is older than the Aztec Empire; teaching existed at Oxford in 1096, while the Aztec Empire formed in 1428.",
    cs: "Oxfordská univerzita je starší než Aztécká říše; v Oxfordu se učilo už v roce 1096, zatímco Aztécká říše vznikla až roku 1428.",
    details: "The university was teaching roughly 300 years before Tenochtitlan was founded."
  },
  {
    emoji: "📜",
    topic: "History & Civilization",
    en: "Ancient Roman concrete grew stronger over centuries because volcanic ash and seawater caused crystals to self-heal microcracks.",
    cs: "Starořímský beton během staletí sílil, protože sopečný popel a mořská voda spouštěly samoopravné krystalické reakce.",
    details: "This remarkable chemistry is why monuments like the Pantheon still stand today."
  },
  {
    emoji: "📜",
    topic: "History & Civilization",
    en: "The shortest war in history lasted only between 38 and 45 minutes, fought between Great Britain and Zanzibar in 1896.",
    cs: "Nejkratší válka v dějinách trvala jen mezi 38 a 45 minutami; odehrála se mezi Velkou Británií a Zanzibarem v roce 1896.",
    details: "The sultan surrendered shortly after British naval artillery bombarded the palace."
  },
  {
    emoji: "🌌",
    topic: "Space & Astronomy",
    en: "A day on Venus is longer than its year; it takes 243 Earth days to rotate, but only 225 Earth days to orbit the Sun.",
    cs: "Den na Venuši trvá déle než její rok; jedna otočka kolem vlastní osy jí trvá 243 pozemských dní, ale oběh kolem Slunce jen 225 dní.",
    details: "Additionally, Venus rotates in retrograde, spinning in the opposite direction to most planets."
  },
  {
    emoji: "🌌",
    topic: "Space & Astronomy",
    en: "Neutron stars are so dense that a single teaspoon of their material would weigh roughly 6 billion tons on Earth.",
    cs: "Neutronové hvězdy jsou tak husté, že jediná čajová lžička jejich hmoty by na Zemi vážila přibližně 6 miliard tun.",
    details: "Their gravity is so intense that atomic structures collapse into pure neutron matter."
  },
  {
    emoji: "🌌",
    topic: "Space & Astronomy",
    en: "Footprints left on the Moon by Apollo astronauts will remain undisturbed for millions of years because there is no wind or water erosion.",
    cs: "Otisky bot astronautů programu Apollo na Měsíci zůstanou nezměněné miliony let, protože tam není vítr ani tekoucí voda.",
    details: "Only the extremely slow impact of micrometeorites will eventually wear them away."
  },
  {
    emoji: "🧬",
    topic: "Biology & Human Body",
    en: "Human DNA shares roughly 60% of its genetic code with a banana and about 98.8% with chimpanzees.",
    cs: "Lidská DNA sdílí zhruba 60 % genetického kódu s banánem a přibližně 98,8 % se šimpanzem.",
    details: "These conserved sequences reflect fundamental cellular machinery common to all living organisms."
  },
  {
    emoji: "🧬",
    topic: "Biology & Human Body",
    en: "Identical twins do not have identical fingerprints; subtle amniotic fluid pressure and womb movements shape unique ridges.",
    cs: "Jednovaječná dvojčata nemají stejné otisky prstů; jemné proudy a tlak plodové vody v děloze vytvářejí unikátní papilární linie.",
    details: "Even with matching DNA, physical friction in the womb creates unique patterns for each twin."
  },
  {
    emoji: "🧠",
    topic: "Psychology & Mind",
    en: "The 'Zeigarnik Effect' explains why our brain is fixated on unfinished tasks far more intensely than completed ones.",
    cs: "Takzvaný 'Zeigarnikové efekt' vysvětluje, proč mozek uchovává nedokončené úkoly v paměti mnohem živěji než ty splněné.",
    details: "Once a task is finished or crossed off, the brain releases the cognitive tension."
  },
  {
    emoji: "🧠",
    topic: "Psychology & Mind",
    en: "The 'Dunning-Kruger Effect' shows that novices often overestimate their competence because they lack the knowledge to recognize their own errors.",
    cs: "Dunning-Krugerův efekt popisuje stav, kdy začátečníci přeceňují své schopnosti, protože ještě nemají dostatek znalostí k rozpoznání vlastních chyb.",
    details: "True experts, by contrast, tend to underestimate their relative superiority."
  },
  {
    emoji: "💻",
    topic: "Technology & Computing",
    en: "The term 'bug' in computing became famous when Grace Hopper found an actual moth trapped in a relay of the Harvard Mark II computer in 1947.",
    cs: "Pojem počítačový 'bug' (brouk) proslavila Grace Hopperová, když v roce 1947 našla skutečného mola uvízlého v relé počítače Harvard Mark II.",
    details: "The team taped the moth into their logbook with the note: 'First actual case of bug being found'."
  },
  {
    emoji: "💻",
    topic: "Technology & Computing",
    en: "The first ever webcam was set up at Cambridge University in 1991 simply to check if the departmental coffee pot was full or empty.",
    cs: "Úplně první webkamera na světě vznikla v roce 1991 na univerzitě v Cambridge, aby vědci viděli, zda je konvice na kávu plná či prázdná.",
    details: "It saved researchers countless wasted walks down the corridor to an empty pot."
  },
  {
    emoji: "⚖️",
    topic: "Law & Justice",
    en: "The principle 'Nulla poena sine lege' means no person can be penalized for an action that was not defined as a crime at the time it occurred.",
    cs: "Právní zásada 'Nulla poena sine lege' zaručuje, že nikdo nemůže být potrestán za jednání, které v době jeho spáchání nebylo trestným činem.",
    details: "This ban on retroactive punishment is a cornerstone of the modern rule of law."
  },
  {
    emoji: "🔤",
    topic: "Languages & Linguistics",
    en: "Basque (Euskara) is a complete language isolate; it has no known linguistic relationship to any other living or dead language family in the world.",
    cs: "Baskičtina je jazykový izolát; nemá prokázanou žádnou příbuznost s jakýmkoli jiným známým jazykem na světě.",
    details: "It has survived in the Pyrenees since before Indo-European languages spread across Europe."
  },
  {
    emoji: "🗺️",
    topic: "Geography & Earth",
    en: "The Challenger Deep in the Mariana Trench is almost 11,000 meters deep; Mount Everest could be dropped inside with over 2 kilometers of water above its peak.",
    cs: "Prohlubeň Challenger v Mariánském příkopu je hluboká téměř 11 000 metrů; kdybychom do ní ponořili Mount Everest, nad jeho vrcholem by zbyly ještě 2 kilometry vody.",
    details: "Water pressure at the bottom exceeds 1,000 times standard sea-level atmospheric pressure."
  },
  {
    emoji: "🍽️",
    topic: "Gastronomy & Food",
    en: "Saffron is the most expensive spice in the world because each flower yields only three stigmas, which must all be carefully hand-picked.",
    cs: "Šafrán je nejdražším kořením planety, protože každý květ poskytuje jen tři blizny, které se musí sklízet ručně.",
    details: "It takes up to 150,000 blossoms to produce a single kilogram of pure saffron."
  }
];
