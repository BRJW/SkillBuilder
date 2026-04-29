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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.rubricSubScore.deleteMany();
  await prisma.rubric.deleteMany();
  await prisma.score.deleteMany();
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

  // 3. Seed people (100-130 per group = ~800-1000 total)
  console.log("Seeding people...");
  const people: { id: string; groupId: string }[] = [];
  const usedNames = new Set<string>();

  for (const group of groups) {
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
      people.push({ id: person.id, groupId: group.id });
    }
  }
  console.log(`  Created ${people.length} people`);

  // 4. Define which groups participate in which rubric skills
  // Not all groups have data for all skills — some groups focus on certain areas
  const groupSkillFocus: Record<number, string[]> = {
    0: ["Listening", "Speaking", "Leadership", "Teamwork", "Creativity", "Adapting", "Planning & Problem-Solving"], // Riverside: all
    1: ["Listening", "Speaking", "Creativity", "Adapting"], // Oak Park: communication + creative
    2: ["Leadership", "Teamwork", "Planning & Problem-Solving", "Adapting"], // Hillcrest: leadership focus
    3: ["Listening", "Speaking", "Teamwork", "Creativity"], // Lakeview: communication + team
    4: ["Creativity", "Adapting", "Planning & Problem-Solving"], // Cedar Grove: creative + planning
    5: ["Listening", "Speaking", "Leadership", "Teamwork"], // Maple Street: core skills
    6: ["Leadership", "Teamwork", "Adapting", "Planning & Problem-Solving", "Creativity"], // Summit: leadership+
    7: ["Listening", "Speaking", "Creativity", "Adapting", "Planning & Problem-Solving"], // Valley View: broad
  };

  // 5. Generate scores
  console.log("Generating scores (this may take a moment)...");
  let scoreCount = 0;
  const BATCH_SIZE = 5000;
  let batch: {
    value: number;
    personId: string;
    subScoreId: string;
    assessedAt: Date;
  }[] = [];

  for (let pIdx = 0; pIdx < people.length; pIdx++) {
    const person = people[pIdx];
    const groupIdx = groups.findIndex((g) => g.id === person.groupId);
    const focusSkills = groupSkillFocus[groupIdx] || Object.keys(SKILLS_DATA);

    // Each person has a talent tier
    const tier = Math.random();
    const baseMin = tier < 0.15 ? 20 : tier < 0.35 ? 35 : tier < 0.7 ? 50 : 70;
    const baseMax = tier < 0.15 ? 45 : tier < 0.35 ? 55 : tier < 0.7 ? 75 : 95;

    // Per-skill base offset
    const skillOffsets: Record<string, number> = {};
    for (const skillName of Object.keys(SKILLS_DATA)) {
      skillOffsets[skillName] = randomInt(-8, 8);
    }

    for (const [skillName, data] of Object.entries(skillMap)) {
      // Skip skills this group doesn't focus on
      if (!focusSkills.includes(skillName)) continue;

      for (const subScoreId of data.subScoreIds) {
        const baseScore = randomInt(baseMin, baseMax) + skillOffsets[skillName];
        const subVariance = randomInt(-4, 4);

        for (let periodIdx = 0; periodIdx < ASSESSMENT_DATES.length; periodIdx++) {
          // ~8% chance of missing a score
          if (Math.random() < 0.08) continue;

          const growth = periodIdx * randomInt(1, 3);
          const noise = randomInt(-4, 4);
          const value = clamp(baseScore + subVariance + growth + noise, 0, 100);

          batch.push({
            value,
            personId: person.id,
            subScoreId,
            assessedAt: ASSESSMENT_DATES[periodIdx],
          });

          if (batch.length >= BATCH_SIZE) {
            await prisma.score.createMany({ data: batch });
            scoreCount += batch.length;
            batch = [];
            process.stdout.write(`\r  ${scoreCount} scores created...`);
          }
        }
      }
    }
  }

  if (batch.length > 0) {
    await prisma.score.createMany({ data: batch });
    scoreCount += batch.length;
  }
  console.log(`\n  Created ${scoreCount} scores`);

  // 6. Create rubrics — each rubric draws from specific skills, matching group coverage
  console.log("Creating sample rubrics...");

  // Rubric 1: Communication Skills (Listening + Speaking) — most groups have this
  const commSubScores = [
    ...skillMap["Listening"].subScoreIds.slice(0, 6),
    ...skillMap["Speaking"].subScoreIds.slice(0, 6),
  ];
  await prisma.rubric.create({
    data: {
      name: "Communication Skills",
      description: "Core communication abilities across listening and speaking.",
      subScores: { create: commSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  // Rubric 2: Leadership & Teamwork — some groups won't have data
  const leaderTeamSubScores = [
    ...skillMap["Leadership"].subScoreIds.slice(0, 7),
    ...skillMap["Teamwork"].subScoreIds.slice(0, 5),
  ];
  await prisma.rubric.create({
    data: {
      name: "Leadership & Teamwork",
      description: "Leadership qualities and collaborative team skills.",
      subScores: { create: leaderTeamSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  // Rubric 3: Creative & Adaptive Thinking
  const creativeSubScores = [
    ...skillMap["Creativity"].subScoreIds.slice(0, 6),
    ...skillMap["Adapting"].subScoreIds.slice(0, 6),
  ];
  await prisma.rubric.create({
    data: {
      name: "Creative & Adaptive Thinking",
      description: "Creativity, innovation, and adaptability measures.",
      subScores: { create: creativeSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  // Rubric 4: Full Assessment (broad sampling)
  const fullSubScores = Object.values(skillMap).flatMap((s) => s.subScoreIds.slice(0, 4));
  await prisma.rubric.create({
    data: {
      name: "Full Assessment",
      description: "Comprehensive rubric sampling key sub-scores from every skill area.",
      subScores: { create: fullSubScores.map((id) => ({ subScoreId: id })) },
    },
  });

  // Rubric 5: Planning & Execution
  const planSubScores = [
    ...skillMap["Planning & Problem-Solving"].subScoreIds.slice(0, 7),
    ...skillMap["Leadership"].subScoreIds.slice(3, 6),
  ];
  await prisma.rubric.create({
    data: {
      name: "Planning & Execution",
      description: "Strategic planning, problem-solving, and execution capabilities.",
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
