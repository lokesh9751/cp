import { prisma } from '../src/lib/prisma.js';

let referenceTime = null;

function getReferenceTime() {
  if (referenceTime) return referenceTime;
  referenceTime = new Date();
  return referenceTime;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const mockQuestions = [
  { id: 1, title: 'Two Sum', type: 'DSA', difficulty: 'Easy', topics: ['Arrays', 'Hash Table'], acceptanceRate: 52 },
  { id: 2, title: 'Reverse Linked List', type: 'DSA', difficulty: 'Easy', topics: ['Linked List'], acceptanceRate: 68 },
  { id: 3, title: 'Longest Increasing Subsequence', type: 'DSA', difficulty: 'Medium', topics: ['Dynamic Programming', 'Binary Search'], acceptanceRate: 45 },
  { id: 4, title: 'Valid Parentheses', type: 'DSA', difficulty: 'Easy', topics: ['Stack', 'Strings'], acceptanceRate: 72 },
  { id: 5, title: 'Merge Two Sorted Lists', type: 'DSA', difficulty: 'Easy', topics: ['Linked List', 'Recursion'], acceptanceRate: 65 },
  { id: 6, title: 'Binary Tree Level Order Traversal', type: 'DSA', difficulty: 'Medium', topics: ['Tree', 'BFS', 'Queue'], acceptanceRate: 58 },
  { id: 7, title: 'Maximum Subarray', type: 'DSA', difficulty: 'Medium', topics: ['Arrays', 'Dynamic Programming', 'Divide & Conquer'], acceptanceRate: 51 },
  { id: 8, title: 'Climbing Stairs', type: 'DSA', difficulty: 'Easy', topics: ['Dynamic Programming', 'Math'], acceptanceRate: 78 },
  { id: 9, title: 'Number of Islands', type: 'DSA', difficulty: 'Medium', topics: ['Graph', 'DFS', 'BFS', 'Union Find'], acceptanceRate: 49 },
  { id: 10, title: 'Longest Common Subsequence', type: 'DSA', difficulty: 'Medium', topics: ['Dynamic Programming', 'Strings'], acceptanceRate: 54 },
  { id: 11, title: 'Coin Change', type: 'DSA', difficulty: 'Medium', topics: ['Dynamic Programming', 'Arrays'], acceptanceRate: 42 },
  { id: 12, title: 'Course Schedule', type: 'DSA', difficulty: 'Medium', topics: ['Graph', 'Topological Sort', 'DFS', 'BFS'], acceptanceRate: 48 },
  { id: 13, title: 'Word Break', type: 'DSA', difficulty: 'Medium', topics: ['Dynamic Programming', 'Strings', 'Trie'], acceptanceRate: 46 },
  { id: 14, title: 'Trapping Rain Water', type: 'DSA', difficulty: 'Hard', topics: ['Arrays', 'Two Pointers', 'Stack'], acceptanceRate: 38 },
  { id: 15, title: 'Median of Two Sorted Arrays', type: 'DSA', difficulty: 'Hard', topics: ['Arrays', 'Binary Search', 'Divide & Conquer'], acceptanceRate: 35 },
  { id: 16, title: 'Regular Expression Matching', type: 'DSA', difficulty: 'Hard', topics: ['Strings', 'Dynamic Programming'], acceptanceRate: 32 },
  { id: 17, title: 'Merge k Sorted Lists', type: 'DSA', difficulty: 'Hard', topics: ['Linked List', 'Heap', 'Divide & Conquer'], acceptanceRate: 41 },
  { id: 18, title: 'Maximum Flow (Edmonds-Karp)', type: 'CP', difficulty: 'Hard', topics: ['Graph', 'Max Flow', 'BFS'], acceptanceRate: 28 },
  { id: 19, title: 'Segment Tree with Lazy Propagation', type: 'CP', difficulty: 'Hard', topics: ['Segment Tree', 'Lazy Propagation'], acceptanceRate: 31 },
  { id: 20, title: 'Dijkstra Shortest Path', type: 'CP', difficulty: 'Medium', topics: ['Graph', 'Shortest Path', 'Heap'], acceptanceRate: 55 },
];

const allTopics = [...new Set(mockQuestions.flatMap((q) => q.topics))];

function getContestsSchedule(refTime) {
  return [
    {
      slug: 'ongoing-dsa-showdown',
      title: 'Ongoing DSA Showdown',
      type: 'DSA',
      description:
        'Test your core Data Structures & Algorithms fundamentals in a 4-hour live round covering Arrays, Trees, Graphs, and Dynamic Programming.\n\nFormat: 5 curated problems ordered from Easy to Hard. Each accepted submission awards full points with standard time penalty.\n\nRules: Individual participation only. Plagiarism or sharing solutions during the live window will result in disqualification.',
      startsAt: new Date(refTime.getTime() - 60 * 60 * 1000),
      endsAt: new Date(refTime.getTime() + 3 * 60 * 60 * 1000),
      durationMinutes: 240,
    },
    {
      slug: 'cp-marathon',
      title: 'CP Marathon',
      type: 'CP',
      description:
        'An extended 6-hour Competitive Programming marathon featuring algorithmic optimization, graph theory, number theory, and advanced data structures.\n\nFormat: 6 challenging ICPC-style problems. Wrong submissions incur a 10-minute penalty once the problem is accepted.\n\nRules: Standard C++, Python, Java, and JavaScript libraries are allowed. External help is strictly prohibited.',
      startsAt: new Date(refTime.getTime() - 2 * 60 * 60 * 1000),
      endsAt: new Date(refTime.getTime() + 4 * 60 * 60 * 1000),
      durationMinutes: 360,
    },
    {
      slug: 'algorithm-weekly',
      title: 'Algorithm Weekly',
      type: 'DSA',
      description:
        'Our flagship weekly DSA round designed for interview prep and algorithmic fluency.\n\nFormat: 4 problems in 120 minutes (1 Easy, 2 Medium, 1 Hard) focusing on clean complexity and edge-case handling.\n\nRules: Register before the countdown reaches zero—registration closes automatically once the contest starts.',
      startsAt: new Date(refTime.getTime() + 4 * 24 * 60 * 60 * 1000),
      endsAt: new Date(refTime.getTime() + 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      durationMinutes: 120,
    },
    {
      slug: 'cp-weekend-challenge',
      title: 'CP Weekend Challenge',
      type: 'CP',
      description:
        'A rated weekend competitive programming contest built around creative observations, greedy proofs, segment trees, and shortest paths.\n\nFormat: 5 problems over 3 hours with dynamic scoring based on solve time.\n\nRules: Make sure you register before the start time. Editorials will be published after the contest concludes.',
      startsAt: new Date(refTime.getTime() + 7 * 24 * 60 * 60 * 1000),
      endsAt: new Date(refTime.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      durationMinutes: 180,
    },
    {
      slug: 'speed-coding-race',
      title: 'Speed Coding Race',
      type: 'DSA',
      description:
        'Fast-paced 2-hour sprint testing implementation speed and accuracy under pressure.\n\nFormat: 4 approachable-to-tricky problems where clean first-try submissions give you a major leaderboard edge.\n\nRules: Individual participation only. Registration closes at contest start.',
      startsAt: new Date(refTime.getTime() + 12 * 24 * 60 * 60 * 1000),
      endsAt: new Date(refTime.getTime() + 12 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      durationMinutes: 120,
    },
  ];
}

async function seed(shouldRefresh = false) {
  console.log('Starting seed...');
  const now = getReferenceTime();

  // Remove accidental "all" topic if seeded previously
  await prisma.topic.deleteMany({ where: { slug: 'all' } });

  console.log('Seeding topics...');
  for (const topicName of allTopics) {
    const slug = slugify(topicName);
    await prisma.topic.upsert({
      where: { name: topicName },
      update: { slug },
      create: { name: topicName, slug },
    });
  }

  console.log('Seeding problems...');
  for (const question of mockQuestions) {
    const difficulty = question.difficulty.toUpperCase();

    await prisma.problem.upsert({
      where: { id: question.id },
      update: {
        title: question.title,
        type: question.type,
        difficulty,
        acceptanceRate: question.acceptanceRate,
      },
      create: {
        id: question.id,
        slug: slugify(question.title),
        title: question.title,
        type: question.type,
        difficulty,
        acceptanceRate: question.acceptanceRate,
      },
    });

    for (const topicName of question.topics) {
      const topic = await prisma.topic.findUnique({ where: { slug: slugify(topicName) } });
      if (topic) {
        await prisma.problemTopic.upsert({
          where: {
            problemId_topicId: {
              problemId: question.id,
              topicId: topic.id,
            },
          },
          update: {},
          create: {
            problemId: question.id,
            topicId: topic.id,
          },
        });
      }
    }
  }

  console.log('Seeding contests...');
  const contests = getContestsSchedule(now);
  const allProblems = await prisma.problem.findMany();

  for (const contest of contests) {
    const durationMinutes = Math.floor((contest.endsAt - contest.startsAt) / 60000);

    await prisma.contest.upsert({
      where: { slug: contest.slug },
      update: shouldRefresh
        ? {
          title: contest.title,
          type: contest.type,
          description: contest.description,
          startsAt: contest.startsAt,
          endsAt: contest.endsAt,
          durationMinutes,
        }
        : {
          description: contest.description,
        },
      create: {
        slug: contest.slug,
        title: contest.title,
        type: contest.type,
        description: contest.description,
        startsAt: contest.startsAt,
        endsAt: contest.endsAt,
        durationMinutes,
        uploadedAt: now,
        createdAt: now,
      },
    });

    const contestRecord = await prisma.contest.findUnique({ where: { slug: contest.slug } });
    for (let i = 0; i < Math.min(5, allProblems.length); i++) {
      await prisma.contestProblem.upsert({
        where: {
          contestId_problemId: {
            contestId: contestRecord.id,
            problemId: allProblems[i].id,
          },
        },
        update: { order: i + 1 },
        create: {
          contestId: contestRecord.id,
          problemId: allProblems[i].id,
          order: i + 1,
        },
      });
    }
  }

  console.log('Seed completed successfully!');
}

async function main() {
  const args = process.argv.slice(2);
  const shouldRefresh = args.includes('--refresh') || process.env.SEED_REFRESH === 'true';

  try {
    await seed(shouldRefresh);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();