import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const SKILLS_DATA: Record<string, string[]> = {
  Listening: [
    "Active Listening",
    "Comprehension",
    "Empathy",
    "Note-Taking",
    "Following Directions",
    "Clarifying Questions",
    "Nonverbal Awareness",
    "Patience",
    "Retention",
    "Critical Listening",
  ],
  Speaking: [
    "Clarity",
    "Confidence",
    "Vocabulary",
    "Persuasion",
    "Tone Control",
    "Audience Awareness",
    "Conciseness",
    "Storytelling",
    "Public Speaking",
    "Articulation",
  ],
  Leadership: [
    "Decision Making",
    "Delegation",
    "Motivation",
    "Vision Setting",
    "Accountability",
    "Conflict Resolution",
    "Mentoring",
    "Strategic Thinking",
    "Integrity",
    "Resilience",
  ],
  Teamwork: [
    "Collaboration",
    "Reliability",
    "Flexibility",
    "Communication",
    "Supportiveness",
    "Shared Responsibility",
    "Trust Building",
    "Conflict Management",
    "Active Participation",
    "Consensus Building",
  ],
  Creativity: [
    "Originality",
    "Brainstorming",
    "Risk Taking",
    "Resourcefulness",
    "Curiosity",
    "Imagination",
    "Innovation",
    "Experimentation",
    "Aesthetic Sense",
    "Lateral Thinking",
  ],
  Adapting: [
    "Flexibility",
    "Stress Management",
    "Open-Mindedness",
    "Learning Agility",
    "Emotional Regulation",
    "Cultural Sensitivity",
    "Recovery Speed",
    "Situational Awareness",
    "Growth Mindset",
    "Tolerance for Ambiguity",
  ],
  "Planning & Problem-Solving": [
    "Goal Setting",
    "Prioritization",
    "Time Management",
    "Analytical Thinking",
    "Resource Allocation",
    "Risk Assessment",
    "Systematic Approach",
    "Decision Analysis",
    "Contingency Planning",
    "Evaluation",
  ],
};

const SCHOOLS = [
  { name: "Riverside Academy", district: "West District" },
  { name: "Oak Park Elementary", district: "Central District" },
  { name: "Hillcrest High School", district: "North District" },
  { name: "Lakeview Middle School", district: "East District" },
  { name: "Cedar Grove School", district: "South District" },
  { name: "Maple Street Academy", district: "Central District" },
];

const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia",
  "Lucas", "Harper", "Henry", "Evelyn", "Alexander", "Abigail", "Daniel",
  "Emily", "Matthew", "Elizabeth", "Jackson", "Sofia", "Sebastian", "Avery",
  "Aiden", "Ella", "Owen", "Scarlett", "Samuel", "Grace", "Ryan", "Chloe",
  "Nathan", "Victoria", "Caleb", "Riley", "Christian", "Aria", "Dylan",
  "Lily", "Isaac", "Aubrey", "Joshua", "Zoey", "Andrew",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
  "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts",
];

const ASSESSMENT_DATES = [
  new Date("2024-09-15"),
  new Date("2024-11-15"),
  new Date("2025-01-15"),
  new Date("2025-03-15"),
  new Date("2025-05-15"),
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
  await prisma.school.deleteMany();
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
          create: subScoreNames.map((name, i) => ({
            name,
            sortOrder: i,
          })),
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

  // 2. Seed schools
  console.log("Seeding schools...");
  const schools = await Promise.all(
    SCHOOLS.map((s) => prisma.school.create({ data: s }))
  );
  console.log(`  Created ${schools.length} schools`);

  // 3. Seed people (~25 per school = ~150 total)
  console.log("Seeding people...");
  const people: { id: string; schoolId: string }[] = [];
  const usedNames = new Set<string>();

  for (const school of schools) {
    const count = randomInt(20, 30);
    for (let i = 0; i < count; i++) {
      let firstName: string, lastName: string, key: string;
      do {
        firstName = pickRandom(FIRST_NAMES);
        lastName = pickRandom(LAST_NAMES);
        key = `${firstName}-${lastName}`;
      } while (usedNames.has(key));
      usedNames.add(key);

      const person = await prisma.person.create({
        data: {
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          schoolId: school.id,
        },
      });
      people.push({ id: person.id, schoolId: school.id });
    }
  }
  console.log(`  Created ${people.length} people`);

  // 4. Generate scores
  console.log("Generating scores (this may take a moment)...");
  let scoreCount = 0;
  const BATCH_SIZE = 5000;
  let batch: {
    value: number;
    personId: string;
    subScoreId: string;
    assessedAt: Date;
  }[] = [];

  for (const person of people) {
    // Each person has a "talent tier": high (30%), mid (50%), low (20%)
    const tier = Math.random();
    const baseMin = tier < 0.2 ? 25 : tier < 0.7 ? 40 : 65;
    const baseMax = tier < 0.2 ? 55 : tier < 0.7 ? 70 : 95;

    // Per-skill base offset (some people stronger in some areas)
    const skillOffsets: Record<string, number> = {};
    for (const skillName of Object.keys(SKILLS_DATA)) {
      skillOffsets[skillName] = randomInt(-10, 10);
    }

    for (const [skillName, data] of Object.entries(skillMap)) {
      for (const subScoreId of data.subScoreIds) {
        // Base score for this person + this sub-score
        const baseScore = randomInt(baseMin, baseMax) + skillOffsets[skillName];
        // Per-sub-score variance
        const subVariance = randomInt(-5, 5);

        for (let periodIdx = 0; periodIdx < ASSESSMENT_DATES.length; periodIdx++) {
          // ~10% chance of missing a score for any given period
          if (Math.random() < 0.1) continue;

          // Growth: small upward trend over time with noise
          const growth = periodIdx * randomInt(1, 4);
          const noise = randomInt(-3, 3);
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

  // Flush remaining
  if (batch.length > 0) {
    await prisma.score.createMany({ data: batch });
    scoreCount += batch.length;
  }
  console.log(`\n  Created ${scoreCount} scores`);

  // 5. Create sample rubrics
  console.log("Creating sample rubrics...");

  // Rubric 1: Communication Skills (Listening + Speaking sub-scores)
  const commSubScores = [
    ...skillMap["Listening"].subScoreIds.slice(0, 5),
    ...skillMap["Speaking"].subScoreIds.slice(0, 5),
  ];
  await prisma.rubric.create({
    data: {
      name: "Communication Skills",
      description:
        "Assesses core communication abilities across listening and speaking domains.",
      subScores: {
        create: commSubScores.map((id) => ({ subScoreId: id })),
      },
    },
  });

  // Rubric 2: Leadership & Teamwork
  const leaderTeamSubScores = [
    ...skillMap["Leadership"].subScoreIds.slice(0, 6),
    ...skillMap["Teamwork"].subScoreIds.slice(0, 4),
  ];
  await prisma.rubric.create({
    data: {
      name: "Leadership & Teamwork",
      description:
        "Evaluates leadership qualities and team collaboration skills.",
      subScores: {
        create: leaderTeamSubScores.map((id) => ({ subScoreId: id })),
      },
    },
  });

  // Rubric 3: Full Assessment (2-3 sub-scores from each skill)
  const fullSubScores = Object.values(skillMap).flatMap((s) =>
    s.subScoreIds.slice(0, 3)
  );
  await prisma.rubric.create({
    data: {
      name: "Full Assessment",
      description:
        "A comprehensive rubric sampling key sub-scores from every skill area.",
      subScores: {
        create: fullSubScores.map((id) => ({ subScoreId: id })),
      },
    },
  });

  console.log("  Created 3 sample rubrics");
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
