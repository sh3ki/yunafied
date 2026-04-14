import "dotenv/config";
import { pool } from "../lib/db.js";

type RoleKey = "admin" | "teacher";

interface SeedChoice {
  text: string;
  isCorrect: boolean;
}

interface SeedQuestion {
  prompt: string;
  points: number;
  choices: SeedChoice[];
}

interface SeedQuiz {
  title: string;
  description: string;
  timePerQuestionSeconds: number;
  isPublished: boolean;
  createdByRole: RoleKey;
  questions: SeedQuestion[];
}

interface SeedCategory {
  name: string;
  description: string;
  createdByRole: RoleKey;
  quizzes: SeedQuiz[];
}

const GAMIFIED_SEED: SeedCategory[] = [
  {
    name: "English Grammar",
    description: "Sentence structure, tenses, and usage rules.",
    createdByRole: "teacher",
    quizzes: [
      {
        title: "Gimme 5: Present Perfect",
        description: "Master present perfect form and usage.",
        timePerQuestionSeconds: 20,
        isPublished: true,
        createdByRole: "teacher",
        questions: [
          {
            prompt: "Which sentence uses present perfect correctly?",
            points: 1000,
            choices: [
              { text: "I have been to Cebu three times this year.", isCorrect: true },
              { text: "I have went to Cebu three times this year.", isCorrect: false },
              { text: "I am go to Cebu three times this year.", isCorrect: false },
              { text: "I has been to Cebu three times this year.", isCorrect: false },
            ],
          },
          {
            prompt: "Choose the correct sentence.",
            points: 1000,
            choices: [
              { text: "She has finished her assignment already.", isCorrect: true },
              { text: "She have finished her assignment already.", isCorrect: false },
              { text: "She finished her assignment already yesterday now.", isCorrect: false },
              { text: "She has finish her assignment already.", isCorrect: false },
            ],
          },
          {
            prompt: "Which question is grammatically correct?",
            points: 1000,
            choices: [
              { text: "Have you submitted your project?", isCorrect: true },
              { text: "Did you have submitted your project?", isCorrect: false },
              { text: "Has you submitted your project?", isCorrect: false },
              { text: "Do you have submit your project?", isCorrect: false },
            ],
          },
          {
            prompt: "Pick the best sentence.",
            points: 1000,
            choices: [
              { text: "They have lived in Davao since 2019.", isCorrect: true },
              { text: "They live in Davao since 2019.", isCorrect: false },
              { text: "They has lived in Davao since 2019.", isCorrect: false },
              { text: "They have living in Davao since 2019.", isCorrect: false },
            ],
          },
          {
            prompt: "Which one is NOT in present perfect tense?",
            points: 1000,
            choices: [
              { text: "He has written two essays this week.", isCorrect: false },
              { text: "We have completed the module.", isCorrect: false },
              { text: "I wrote my reflection last night.", isCorrect: true },
              { text: "You have improved a lot this semester.", isCorrect: false },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Vocabulary",
    description: "Synonyms, antonyms, and context clues.",
    createdByRole: "admin",
    quizzes: [
      {
        title: "Word Power Sprint",
        description: "Context-rich vocabulary challenge.",
        timePerQuestionSeconds: 18,
        isPublished: true,
        createdByRole: "admin",
        questions: [
          {
            prompt: "Which word is closest in meaning to 'ubiquitous'?",
            points: 1000,
            choices: [
              { text: "Rare", isCorrect: false },
              { text: "Ancient", isCorrect: false },
              { text: "Everywhere", isCorrect: true },
              { text: "Temporary", isCorrect: false },
            ],
          },
          {
            prompt: "Choose the best antonym for 'benevolent'.",
            points: 1000,
            choices: [
              { text: "Kind", isCorrect: false },
              { text: "Cruel", isCorrect: true },
              { text: "Helpful", isCorrect: false },
              { text: "Patient", isCorrect: false },
            ],
          },
          {
            prompt: "In 'The room was dim', dim most nearly means:",
            points: 1000,
            choices: [
              { text: "Bright", isCorrect: false },
              { text: "Silent", isCorrect: false },
              { text: "Dark", isCorrect: true },
              { text: "Large", isCorrect: false },
            ],
          },
          {
            prompt: "Which sentence uses 'meticulous' correctly?",
            points: 1000,
            choices: [
              { text: "She was meticulous and forgot everything.", isCorrect: false },
              { text: "He kept meticulous notes for every experiment.", isCorrect: true },
              { text: "The weather is meticulous today.", isCorrect: false },
              { text: "Meticulous means very noisy.", isCorrect: false },
            ],
          },
          {
            prompt: "Which word best completes: 'His answer was ___ and easy to understand.'",
            points: 1000,
            choices: [
              { text: "Obscure", isCorrect: false },
              { text: "Lucid", isCorrect: true },
              { text: "Vague", isCorrect: false },
              { text: "Chaotic", isCorrect: false },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Mathematics",
    description: "Core arithmetic and algebra fundamentals.",
    createdByRole: "teacher",
    quizzes: [
      {
        title: "Math Blitz: Fundamentals",
        description: "Quick-fire math basics for confidence building.",
        timePerQuestionSeconds: 22,
        isPublished: true,
        createdByRole: "teacher",
        questions: [
          {
            prompt: "What is 18 + 27?",
            points: 1000,
            choices: [
              { text: "44", isCorrect: false },
              { text: "45", isCorrect: true },
              { text: "46", isCorrect: false },
              { text: "47", isCorrect: false },
            ],
          },
          {
            prompt: "Solve for x: 3x = 21",
            points: 1000,
            choices: [
              { text: "5", isCorrect: false },
              { text: "6", isCorrect: false },
              { text: "7", isCorrect: true },
              { text: "8", isCorrect: false },
            ],
          },
          {
            prompt: "What is 15% of 200?",
            points: 1000,
            choices: [
              { text: "20", isCorrect: false },
              { text: "25", isCorrect: false },
              { text: "30", isCorrect: true },
              { text: "35", isCorrect: false },
            ],
          },
          {
            prompt: "If a = 4 and b = 9, what is a + b?",
            points: 1000,
            choices: [
              { text: "12", isCorrect: false },
              { text: "13", isCorrect: true },
              { text: "14", isCorrect: false },
              { text: "15", isCorrect: false },
            ],
          },
          {
            prompt: "What is the value of 9 squared?",
            points: 1000,
            choices: [
              { text: "72", isCorrect: false },
              { text: "79", isCorrect: false },
              { text: "81", isCorrect: true },
              { text: "91", isCorrect: false },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Science",
    description: "General science concepts and reasoning.",
    createdByRole: "admin",
    quizzes: [
      {
        title: "Science Quick Check",
        description: "Test your knowledge in basic science topics.",
        timePerQuestionSeconds: 20,
        isPublished: true,
        createdByRole: "admin",
        questions: [
          {
            prompt: "What gas do plants absorb during photosynthesis?",
            points: 1000,
            choices: [
              { text: "Oxygen", isCorrect: false },
              { text: "Nitrogen", isCorrect: false },
              { text: "Carbon Dioxide", isCorrect: true },
              { text: "Hydrogen", isCorrect: false },
            ],
          },
          {
            prompt: "Which is the largest planet in our solar system?",
            points: 1000,
            choices: [
              { text: "Earth", isCorrect: false },
              { text: "Saturn", isCorrect: false },
              { text: "Jupiter", isCorrect: true },
              { text: "Mars", isCorrect: false },
            ],
          },
          {
            prompt: "Water boils at what temperature at sea level?",
            points: 1000,
            choices: [
              { text: "80 C", isCorrect: false },
              { text: "90 C", isCorrect: false },
              { text: "100 C", isCorrect: true },
              { text: "120 C", isCorrect: false },
            ],
          },
          {
            prompt: "Which body system carries oxygen and nutrients in blood?",
            points: 1000,
            choices: [
              { text: "Digestive system", isCorrect: false },
              { text: "Circulatory system", isCorrect: true },
              { text: "Nervous system", isCorrect: false },
              { text: "Skeletal system", isCorrect: false },
            ],
          },
          {
            prompt: "What is the center of an atom called?",
            points: 1000,
            choices: [
              { text: "Electron cloud", isCorrect: false },
              { text: "Shell", isCorrect: false },
              { text: "Nucleus", isCorrect: true },
              { text: "Proton ring", isCorrect: false },
            ],
          },
        ],
      },
    ],
  },
];

function validateQuestions(questions: SeedQuestion[]): void {
  questions.forEach((question, qIndex) => {
    if (!question.prompt.trim()) {
      throw new Error(`Question ${qIndex + 1} must have a prompt.`);
    }

    if (!question.choices.length || question.choices.length < 2) {
      throw new Error(`Question ${qIndex + 1} must have at least 2 choices.`);
    }

    const correctCount = question.choices.filter((choice) => choice.isCorrect).length;
    if (correctCount !== 1) {
      throw new Error(`Question ${qIndex + 1} must have exactly one correct choice.`);
    }
  });
}

async function getCreatorIds(): Promise<Record<RoleKey, string>> {
  const directResult = await pool.query<{ id: string; role: RoleKey }>(
    `SELECT id, role
       FROM users
      WHERE email IN ('admin@yuna.edu', 'teacher@yuna.edu')`,
  );

  const ids: Partial<Record<RoleKey, string>> = {};

  directResult.rows.forEach((row) => {
    ids[row.role] = row.id;
  });

  if (!ids.admin) {
    const adminFallback = await pool.query<{ id: string }>(
      `SELECT id
         FROM users
        WHERE role = 'admin'
        ORDER BY created_at ASC
        LIMIT 1`,
    );
    ids.admin = adminFallback.rows[0]?.id;
  }

  if (!ids.teacher) {
    const teacherFallback = await pool.query<{ id: string }>(
      `SELECT id
         FROM users
        WHERE role = 'teacher'
        ORDER BY created_at ASC
        LIMIT 1`,
    );
    ids.teacher = teacherFallback.rows[0]?.id;
  }

  if (!ids.admin || !ids.teacher) {
    throw new Error("Seeder requires at least one admin and one teacher user. Run 'npm run db:seed --prefix backend' first.");
  }

  return ids as Record<RoleKey, string>;
}

async function main(): Promise<void> {
  const creators = await getCreatorIds();
  const client = await pool.connect();

  let createdCategories = 0;
  let createdQuizzes = 0;
  let createdQuestions = 0;
  let createdChoices = 0;

  try {
    await client.query("BEGIN");

    for (const category of GAMIFIED_SEED) {
      for (const quiz of category.quizzes) {
        validateQuestions(quiz.questions);
      }

      const existingCategory = await client.query<{ id: string }>(
        `SELECT id
           FROM gamified_categories
          WHERE name = $1
          LIMIT 1`,
        [category.name],
      );

      const categoryRow = await client.query<{ id: string }>(
        `INSERT INTO gamified_categories (name, description, created_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (name)
         DO UPDATE
            SET description = EXCLUDED.description,
                updated_at = NOW()
         RETURNING id`,
        [category.name, category.description, creators[category.createdByRole]],
      );

      const categoryId = categoryRow.rows[0].id;

      if (!existingCategory.rows[0]) {
        createdCategories += 1;
      }

      for (const quiz of category.quizzes) {
        const existingQuiz = await client.query<{ id: string }>(
          `SELECT id
             FROM gamified_quizzes
            WHERE category_id = $1
              AND title = $2
            LIMIT 1`,
          [categoryId, quiz.title],
        );

        if (existingQuiz.rows[0]) {
          continue;
        }

        const insertedQuiz = await client.query<{ id: string }>(
          `INSERT INTO gamified_quizzes (
             category_id,
             title,
             description,
             time_per_question_seconds,
             is_published,
             created_by,
             updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [
            categoryId,
            quiz.title,
            quiz.description,
            quiz.timePerQuestionSeconds,
            quiz.isPublished,
            creators[quiz.createdByRole],
          ],
        );

        const quizId = insertedQuiz.rows[0].id;
        createdQuizzes += 1;

        for (let qIndex = 0; qIndex < quiz.questions.length; qIndex += 1) {
          const question = quiz.questions[qIndex];
          const insertedQuestion = await client.query<{ id: string }>(
            `INSERT INTO gamified_questions (quiz_id, prompt, question_order, points, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id`,
            [quizId, question.prompt, qIndex + 1, question.points],
          );

          const questionId = insertedQuestion.rows[0].id;
          createdQuestions += 1;

          for (let cIndex = 0; cIndex < question.choices.length; cIndex += 1) {
            const choice = question.choices[cIndex];
            await client.query(
              `INSERT INTO gamified_choices (question_id, choice_text, choice_order, is_correct, updated_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [questionId, choice.text, cIndex + 1, choice.isCorrect],
            );
            createdChoices += 1;
          }
        }
      }
    }

    await client.query("COMMIT");

    console.log(
      `Gamified seed done. Categories created: ${createdCategories}, quizzes created: ${createdQuizzes}, questions created: ${createdQuestions}, choices created: ${createdChoices}.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to seed gamified data:", error);
  process.exit(1);
});
