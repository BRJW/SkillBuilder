import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const SKILLS_DATA: Record<string, string[]> = {
  Listening: [
    "Active Listening", "Comprehension", "Empathy", "Note-Taking",
    "Following Directions", "Clarifying Questions", "Nonverbal Awareness",
    "Patience", "Retention", "Critical Listening",
  ],
  Speaking: [
    "Clarity", "Confidence", "Vocabulary", "Persuasion", "Tone Control",
    "Audience Awareness", "Conciseness", "Storytelling", "Public Speaking",
    "Articulation",
  ],
  Leadership: [
    "Decision Making", "Delegation", "Motivation", "Vision Setting",
    "Accountability", "Conflict Resolution", "Mentoring", "Strategic Thinking",
    "Integrity", "Resilience",
  ],
  Teamwork: [
    "Collaboration", "Reliability", "Flexibility", "Communication",
    "Supportiveness", "Shared Responsibility", "Trust Building",
    "Conflict Management", "Active Participation", "Consensus Building",
  ],
  Creativity: [
    "Originality", "Brainstorming", "Risk Taking", "Resourcefulness",
    "Curiosity", "Imagination", "Innovation", "Experimentation",
    "Aesthetic Sense", "Lateral Thinking",
  ],
  Adapting: [
    "Flexibility", "Stress Management", "Open-Mindedness", "Learning Agility",
    "Emotional Regulation", "Cultural Sensitivity", "Recovery Speed",
    "Situational Awareness", "Growth Mindset", "Tolerance for Ambiguity",
  ],
  "Planning & Problem-Solving": [
    "Goal Setting", "Prioritization", "Time Management", "Analytical Thinking",
    "Resource Allocation", "Risk Assessment", "Systematic Approach",
    "Decision Analysis", "Contingency Planning", "Evaluation",
  ],
};

const GROUPS = [
  { name: "Riverside Academy", district: "West District" },
  { name: "Oak Park Elementary", district: "Central District" },
  { name: "Hillcrest High School", district: "North District" },
  { name: "Lakeview Middle School", district: "East District" },
  { name: "Cedar Grove School", district: "South District" },
  { name: "Maple Street Academy", district: "Central District" },
  { name: "Summit Prep", district: "West District" },
  { name: "Valley View Institute", district: "North District" },
];

const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia",
  "Lucas", "Harper", "Henry", "Evelyn", "Alexander", "Abigail", "Daniel",
  "Emily", "Matthew", "Elizabeth", "Jackson", "Sofia", "Sebastian", "Avery",
  "Aiden", "Ella", "Owen", "Scarlett", "Samuel", "Grace", "Ryan", "Chloe",
  "Nathan", "Victoria", "Caleb", "Riley", "Christian", "Aria", "Dylan",
  "Lily", "Isaac", "Aubrey", "Joshua", "Zoey", "Andrew", "Penelope",
  "Gabriel", "Layla", "Carter", "Nora", "Julian", "Camila", "Luke",
  "Hannah", "Jack", "Addison", "Wyatt", "Eleanor", "Jayden", "Savannah",
  "Leo", "Brooklyn", "Grayson", "Leah", "Asher", "Zoe", "Elijah", "Stella",
  "Lincoln", "Hazel", "Isaiah", "Lucy", "Theodore", "Violet", "David",
  "Aurora", "Joseph", "Bella", "John", "Claire", "Thomas", "Skylar",
  "Christopher", "Paisley", "Maverick", "Everly", "Josiah", "Anna",
  "Charles", "Caroline", "Miles", "Genesis", "Ezra", "Naomi",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
  "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Phillips", "Evans", "Turner", "Diaz", "Parker",
  "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales",
  "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
  "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim",
  "Cox", "Ward", "Richardson", "Watson", "Brooks", "Chavez", "Wood",
  "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes", "Price",
  "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross",
  "Foster", "Jimenez",
];

const ASSESSMENT_DATES = [
  new Date("2024-09-15"),
  new Date("2024-11-15"),
  new Date("2025-01-15"),
  new Date("2025-03-15"),
  new Date("2025-05-15"),
  new Date("2025-07-15"),
];

// --- Distribution helpers ---

function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function skewedRandom(mean: number, stdDev: number, skew: number): number {
  // Skew-normal approximation
  const delta = skew / Math.sqrt(1 + skew * skew);
  const u0 = normalRandom(0, 1);
  const v = normalRandom(0, 1);
  const z = delta * Math.abs(u0) + Math.sqrt(1 - delta * delta) * v;
  return mean + z * stdDev;
}

function bimodalRandom(mean: number, stdDev: number, gap: number): number {
  // Two clusters separated by `gap`, mixing ratio ~40/60
  if (Math.random() < 0.4) {
    return normalRandom(mean - gap / 2, stdDev * 0.6);
  }
  return normalRandom(mean + gap / 2, stdDev * 0.7);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Skill distribution profiles ---
// Each skill has a fundamentally different statistical shape
interface SkillProfile {
  mean: number;
  stdDev: number;
  shape: "normal" | "left-skewed" | "right-skewed" | "bimodal";
  skew?: number;       // for skewed shapes
  bimodalGap?: number; // for bimodal shape
  growthPerPeriod: number;
  growthAccel: number; // acceleration: growth changes per period
}

const SKILL_PROFILES: Record<string, SkillProfile> = {
  Listening: {
    mean: 72, stdDev: 8,
    shape: "left-skewed", skew: -0.8,
    growthPerPeriod: 2.5, growthAccel: -0.1,
  },
  Speaking: {
    mean: 55, stdDev: 16,
    shape: "normal",
    growthPerPeriod: 1.8, growthAccel: 0.3,
  },
  Leadership: {
    mean: 42, stdDev: 15,
    shape: "bimodal", bimodalGap: 28,
    growthPerPeriod: 1.2, growthAccel: 0.2,
  },
  Teamwork: {
    mean: 68, stdDev: 10,
    shape: "normal",
    growthPerPeriod: 2.0, growthAccel: -0.15,
  },
  Creativity: {
    mean: 50, stdDev: 18,
    shape: "right-skewed", skew: 0.7,
    growthPerPeriod: 0.5, growthAccel: 0.4,
  },
  Adapting: {
    mean: 62, stdDev: 12,
    shape: "normal",
    growthPerPeriod: 2.2, growthAccel: 0.0,
  },
  "Planning & Problem-Solving": {
    mean: 48, stdDev: 14,
    shape: "right-skewed", skew: 0.4,
    growthPerPeriod: 1.5, growthAccel: 0.25,
  },
};

// --- Group-specific modifiers ---
// Each group has strengths/weaknesses (offsets) and different growth rates
interface GroupModifier {
  meanOffset: Record<string, number>;
  stdDevScale: Record<string, number>; // multiplier on stdDev
  growthMult: number; // overall growth multiplier
  missRate: number;   // % chance of missing a step
}

const GROUP_MODIFIERS: GroupModifier[] = [
  { // 0: Riverside Academy — strong all-around, especially leadership, fast growth
    meanOffset: { Listening: 5, Speaking: 8, Leadership: 15, Teamwork: 5, Creativity: 3, Adapting: 5, "Planning & Problem-Solving": 8 },
    stdDevScale: { Listening: 0.8, Speaking: 0.9, Leadership: 1.0, Teamwork: 0.85, Creativity: 1.0, Adapting: 0.9, "Planning & Problem-Solving": 0.9 },
    growthMult: 1.3, missRate: 0.05,
  },
  { // 1: Oak Park Elementary — excellent communication, weak creativity
    meanOffset: { Listening: 10, Speaking: 12, Leadership: -5, Teamwork: 3, Creativity: -10, Adapting: 2, "Planning & Problem-Solving": -3 },
    stdDevScale: { Listening: 0.7, Speaking: 0.8, Leadership: 1.2, Teamwork: 1.0, Creativity: 1.3, Adapting: 1.0, "Planning & Problem-Solving": 1.1 },
    growthMult: 0.8, missRate: 0.10,
  },
  { // 2: Hillcrest High — strong leadership & planning, weak communication
    meanOffset: { Listening: -5, Speaking: -3, Leadership: 12, Teamwork: 8, Creativity: -5, Adapting: 5, "Planning & Problem-Solving": 10 },
    stdDevScale: { Listening: 1.2, Speaking: 1.1, Leadership: 0.8, Teamwork: 0.9, Creativity: 1.1, Adapting: 1.0, "Planning & Problem-Solving": 0.85 },
    growthMult: 1.2, missRate: 0.06,
  },
  { // 3: Lakeview Middle — strong teamwork, moderate elsewhere
    meanOffset: { Listening: 3, Speaking: 3, Leadership: -2, Teamwork: 14, Creativity: 5, Adapting: 3, "Planning & Problem-Solving": -2 },
    stdDevScale: { Listening: 1.0, Speaking: 1.0, Leadership: 1.1, Teamwork: 0.7, Creativity: 1.0, Adapting: 0.9, "Planning & Problem-Solving": 1.2 },
    growthMult: 1.0, missRate: 0.08,
  },
  { // 4: Cedar Grove — very creative, poor planning, volatile
    meanOffset: { Listening: -5, Speaking: -3, Leadership: -8, Teamwork: 2, Creativity: 18, Adapting: 8, "Planning & Problem-Solving": -12 },
    stdDevScale: { Listening: 1.1, Speaking: 1.2, Leadership: 1.3, Teamwork: 1.1, Creativity: 0.9, Adapting: 1.0, "Planning & Problem-Solving": 1.4 },
    growthMult: 0.7, missRate: 0.12,
  },
  { // 5: Maple Street Academy — average baseline, tight distributions
    meanOffset: { Listening: 0, Speaking: 0, Leadership: 0, Teamwork: 0, Creativity: 0, Adapting: 0, "Planning & Problem-Solving": 0 },
    stdDevScale: { Listening: 0.9, Speaking: 0.9, Leadership: 0.9, Teamwork: 0.9, Creativity: 0.9, Adapting: 0.9, "Planning & Problem-Solving": 0.9 },
    growthMult: 1.0, missRate: 0.08,
  },
  { // 6: Summit Prep — excellent planning & leadership, poor creativity, fast growth
    meanOffset: { Listening: -2, Speaking: 5, Leadership: 10, Teamwork: 3, Creativity: -12, Adapting: 3, "Planning & Problem-Solving": 15 },
    stdDevScale: { Listening: 1.0, Speaking: 0.9, Leadership: 0.85, Teamwork: 1.0, Creativity: 1.2, Adapting: 1.0, "Planning & Problem-Solving": 0.75 },
    growthMult: 1.4, missRate: 0.04,
  },
  { // 7: Valley View Institute — strong adapting, wide variance overall
    meanOffset: { Listening: 2, Speaking: -2, Leadership: -3, Teamwork: 5, Creativity: 5, Adapting: 14, "Planning & Problem-Solving": 3 },
    stdDevScale: { Listening: 1.15, Speaking: 1.2, Leadership: 1.15, Teamwork: 1.1, Creativity: 1.1, Adapting: 0.8, "Planning & Problem-Solving": 1.15 },
    growthMult: 1.1, missRate: 0.07,
  },
];

// Which skills each group covers (not all groups assess all skills)
const GROUP_SKILL_FOCUS: Record<number, string[]> = {
  0: ["Listening", "Speaking", "Leadership", "Teamwork", "Creativity", "Adapting", "Planning & Problem-Solving"],
  1: ["Listening", "Speaking", "Creativity", "Adapting"],
  2: ["Leadership", "Teamwork", "Planning & Problem-Solving", "Adapting"],
  3: ["Listening", "Speaking", "Teamwork", "Creativity"],
  4: ["Creativity", "Adapting", "Planning & Problem-Solving"],
  5: ["Listening", "Speaking", "Leadership", "Teamwork"],
  6: ["Leadership", "Teamwork", "Adapting", "Planning & Problem-Solving", "Creativity"],
  7: ["Listening", "Speaking", "Creativity", "Adapting", "Planning & Problem-Solving"],
};

// Generate a base value from the skill's distribution shape
function sampleFromProfile(profile: SkillProfile, groupMod: GroupModifier, skillName: string): number {
  const mean = profile.mean + (groupMod.meanOffset[skillName] ?? 0);
  const sd = profile.stdDev * (groupMod.stdDevScale[skillName] ?? 1.0);

  switch (profile.shape) {
    case "left-skewed":
      return skewedRandom(mean, sd, profile.skew ?? -0.8);
    case "right-skewed":
      return skewedRandom(mean, sd, profile.skew ?? 0.7);
    case "bimodal":
      return bimodalRandom(mean, sd, profile.bimodalGap ?? 25);
    default:
      return normalRandom(mean, sd);
  }
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.rubricSubScore.deleteMany();
  await prisma.rubric.deleteMany();
  await prisma.step.deleteMany();
  await prisma.person.deleteMany();
  await prisma.group.deleteMany();
  await prisma.subScore.deleteMany();
  await prisma.skill.deleteMany();

  // 1. Seed skills and sub-scores
  console.log("Seeding skills and sub-scores...");
  const skillMap: Record<string, { skillId: string; subScoreIds: string[] }> = {};

  let skillOrder = 0;
  for (const [skillName, subScoreNames] of Object.entries(SKILLS_DATA)) {
    const skill = await prisma.skill.create({
      data: {
        name: skillName,
        sortOrder: skillOrder++,
        subScores: {
          create: subScoreNames.map((name, i) => ({ name, sortOrder: i })),
        },
      },
      include: { subScores: true },
    });

    skillMap[skillName] = {
      skillId: skill.id,
      subScoreIds: skill.subScores.map((ss) => ss.id),
    };
  }

  const allSubScoreIds = Object.values(skillMap).flatMap((s) => s.subScoreIds);
  console.log(`  Created ${Object.keys(skillMap).length} skills with ${allSubScoreIds.length} sub-scores`);

  // 2. Seed groups
  console.log("Seeding groups...");
  const groups = await Promise.all(
    GROUPS.map((g) => prisma.group.create({ data: g }))
  );
  console.log(`  Created ${groups.length} groups`);

  // 3. Seed people (100-130 per group)
  console.log("Seeding people...");
  const people: { id: string; groupIdx: number }[] = [];
  const usedNames = new Set<string>();

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const group = groups[gIdx];
    const count = randomInt(100, 130);
    for (let i = 0; i < count; i++) {
      let firstName: string, lastName: string, key: string;
      do {
        firstName = pickRandom(FIRST_NAMES);
        lastName = pickRandom(LAST_NAMES);
        key = `${firstName}-${lastName}-${group.id.slice(0, 4)}`;
      } while (usedNames.has(key));
      usedNames.add(key);

      const person = await prisma.person.create({
        data: {
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@example.com`,
          groupId: group.id,
        },
      });
      people.push({ id: person.id, groupIdx: gIdx });
    }
  }
  console.log(`  Created ${people.length} people`);

  // 4. Generate steps with rich distributions
  console.log("Generating steps (this may take a moment)...");
  let stepCount = 0;
  const BATCH_SIZE = 5000;
  let batch: { value: number; personId: string; subScoreId: string; assessedAt: Date }[] = [];

  for (const person of people) {
    const groupMod = GROUP_MODIFIERS[person.groupIdx];
    const focusSkills = GROUP_SKILL_FOCUS[person.groupIdx] || Object.keys(SKILLS_DATA);

    // Each person gets a stable per-skill baseline drawn from the distribution
    const personSkillBases: Record<string, number> = {};
    for (const skillName of Object.keys(SKILLS_DATA)) {
      if (!focusSkills.includes(skillName)) continue;
      const profile = SKILL_PROFILES[skillName];
      personSkillBases[skillName] = sampleFromProfile(profile, groupMod, skillName);
    }

    // Per sub-score: add a small personal offset (some people are stronger in certain sub-scores)
    const personSubScoreOffsets: Record<string, number> = {};
    for (const [skillName, data] of Object.entries(skillMap)) {
      if (!focusSkills.includes(skillName)) continue;
      for (const ssId of data.subScoreIds) {
        personSubScoreOffsets[ssId] = normalRandom(0, 3.5);
      }
    }

    for (const [skillName, data] of Object.entries(skillMap)) {
      if (!focusSkills.includes(skillName)) continue;
      const profile = SKILL_PROFILES[skillName];
      const baseValue = personSkillBases[skillName];

      for (const subScoreId of data.subScoreIds) {
        const ssOffset = personSubScoreOffsets[subScoreId] ?? 0;

        for (let periodIdx = 0; periodIdx < ASSESSMENT_DATES.length; periodIdx++) {
          // Miss rate varies by group
          if (Math.random() < groupMod.missRate) continue;

          // Growth: base growth + acceleration + group multiplier
          const growth = (profile.growthPerPeriod + profile.growthAccel * periodIdx)
            * periodIdx * groupMod.growthMult;

          // Session noise: smaller for later periods (people stabilize)
          const noiseScale = Math.max(1.5, 4.0 - periodIdx * 0.4);
          const noise = normalRandom(0, noiseScale);

          const rawValue = baseValue + ssOffset + growth + noise;
          const value = round2(clamp(rawValue, 0, 100));

          batch.push({
            value,
            personId: person.id,
            subScoreId,
            assessedAt: ASSESSMENT_DATES[periodIdx],
          });

          if (batch.length >= BATCH_SIZE) {
            await prisma.step.createMany({ data: batch });
            stepCount += batch.length;
            batch = [];
            process.stdout.write(`\r  ${stepCount} steps created...`);
          }
        }
      }
    }
  }

  if (batch.length > 0) {
    await prisma.step.createMany({ data: batch });
    stepCount += batch.length;
  }
  console.log(`\n  Created ${stepCount} steps`);

  // 5. Create rubrics
  console.log("Creating sample rubrics...");

  const commSubScores = [
    ...skillMap["Listening"].subScoreIds.slice(0, 6),
    ...skillMap["Speaking"].subScoreIds.slice(0, 6),
  ];
  await prisma.rubric.create({
    data: {
      name: "Communication Skills",
      description: "Core communication abilities across listening and speaking.",
      goalScore: 65,
      subScores: { create: commSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  const leaderTeamSubScores = [
    ...skillMap["Leadership"].subScoreIds.slice(0, 7),
    ...skillMap["Teamwork"].subScoreIds.slice(0, 5),
  ];
  await prisma.rubric.create({
    data: {
      name: "Leadership & Teamwork",
      description: "Leadership qualities and collaborative team skills.",
      goalScore: 60,
      subScores: { create: leaderTeamSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  const creativeSubScores = [
    ...skillMap["Creativity"].subScoreIds.slice(0, 6),
    ...skillMap["Adapting"].subScoreIds.slice(0, 6),
  ];
  await prisma.rubric.create({
    data: {
      name: "Creative & Adaptive Thinking",
      description: "Creativity, innovation, and adaptability measures.",
      goalScore: 55,
      subScores: { create: creativeSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  const fullSubScores = Object.values(skillMap).flatMap((s) => s.subScoreIds.slice(0, 4));
  // Full Assessment gets per-sub-score goal overrides on a few sub-scores
  const fullSubScoreGoals: Record<number, number> = {
    0: 75,  // first sub-score of first skill gets a higher goal
    3: 60,  // fourth sub-score gets a lower goal
    8: 80,  // ninth sub-score gets a high goal
  };
  await prisma.rubric.create({
    data: {
      name: "Full Assessment",
      description: "Comprehensive rubric sampling key sub-scores from every skill area.",
      goalScore: 70,
      subScores: {
        create: fullSubScores.map((id, idx) => ({
          subScoreId: id,
          ...(fullSubScoreGoals[idx] != null ? { goalScore: fullSubScoreGoals[idx] } : {}),
        })),
      },
    },
  });

  const planSubScores = [
    ...skillMap["Planning & Problem-Solving"].subScoreIds.slice(0, 7),
    ...skillMap["Leadership"].subScoreIds.slice(3, 6),
  ];
  await prisma.rubric.create({
    data: {
      name: "Planning & Execution",
      description: "Strategic planning, problem-solving, and execution capabilities.",
      goalScore: 60,
      subScores: { create: planSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  console.log("  Created 5 sample rubrics");
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
