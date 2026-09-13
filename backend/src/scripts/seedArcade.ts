import "dotenv/config";
import { pool } from "../lib/db.js";

type GameType = "speed_run" | "match_master" | "word_builder" | "memory_flip" | "boss_battle" | "quest_adventure";

const englishGames: Array<{ slug: string; title: string; type: GameType; category: string; description: string }> = [
  { slug: "speed-run-grammar-tenses", title: "Tense Turbo", type: "speed_run", category: "English Grammar", description: "Race through English tense questions." },
  { slug: "speed-run-vocabulary-context", title: "Context Dash", type: "speed_run", category: "Vocabulary", description: "Choose the strongest word for each context." },
  { slug: "speed-run-reading-main-idea", title: "Main Idea Sprint", type: "speed_run", category: "Reading Comprehension", description: "Find the main idea before time runs out." },
  { slug: "match-master-synonyms", title: "Synonym Match", type: "match_master", category: "Vocabulary", description: "Match words with their closest meanings." },
  { slug: "match-master-grammar-terms", title: "Grammar Pair-Up", type: "match_master", category: "English Grammar", description: "Match grammar terms with their examples." },
  { slug: "match-master-idioms", title: "Idiom Match", type: "match_master", category: "Vocabulary", description: "Pair idioms with their meanings." },
  { slug: "word-builder-spelling", title: "Spell Forge", type: "word_builder", category: "Spelling", description: "Build correctly spelled English words." },
  { slug: "word-builder-sentences", title: "Sentence Architect", type: "word_builder", category: "English Grammar", description: "Arrange language into clear sentences." },
  { slug: "word-builder-definitions", title: "Definition Builder", type: "word_builder", category: "Vocabulary", description: "Build the answer from a definition clue." },
  { slug: "memory-flip-vocabulary", title: "Vocabulary Vault", type: "memory_flip", category: "Vocabulary", description: "Flip cards to match words and meanings." },
  { slug: "memory-flip-parts-of-speech", title: "Parts of Speech Memory", type: "memory_flip", category: "English Grammar", description: "Match parts of speech with examples." },
  { slug: "memory-flip-literary-terms", title: "Literary Memory", type: "memory_flip", category: "Reading Comprehension", description: "Match literary terms with definitions." },
  { slug: "boss-battle-grammar", title: "The Grammar Guardian", type: "boss_battle", category: "English Grammar", description: "Defeat the boss by mastering grammar." },
  { slug: "boss-battle-vocabulary", title: "The Word Warden", type: "boss_battle", category: "Vocabulary", description: "Break through vocabulary stages." },
  { slug: "boss-battle-reading", title: "The Reading Dragon", type: "boss_battle", category: "Reading Comprehension", description: "Conquer a reading comprehension challenge." },
  { slug: "quest-adventure-grammar", title: "Grammar Kingdom", type: "quest_adventure", category: "English Grammar", description: "Travel across a kingdom of grammar quests." },
  { slug: "quest-adventure-vocabulary", title: "Lexicon Island", type: "quest_adventure", category: "Vocabulary", description: "Explore an island of new words." },
  { slug: "quest-adventure-reading", title: "The Reading Trail", type: "quest_adventure", category: "Reading Comprehension", description: "Follow clues through short reading passages." },
];

const speedQuestions = [
  ["Which sentence is correct?", ["She has finished her work.", "She have finished her work.", "She has finish her work.", "She finished has her work."], 0],
  ["Choose the past tense of 'go'.", ["goed", "gone", "went", "going"], 2],
  ["Which word best completes: The answer was ___.", ["clear", "clearly", "clarity", "clearing"], 0],
];

async function main() {
  const actor = await pool.query<{ id: string }>("SELECT id FROM users WHERE role IN ('admin', 'teacher') ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, created_at LIMIT 1");
  if (!actor.rows[0]) throw new Error("Create at least one admin or teacher before seeding arcade games.");
  const userId = actor.rows[0].id;
  const categories = new Map<string, string>();
  for (const name of [...new Set(englishGames.map((g) => g.category))]) {
    const result = await pool.query<{ id: string }>(`INSERT INTO gamified_categories (name, description, created_by) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET updated_at = NOW() RETURNING id`, [name, `English learning games for ${name.toLowerCase()}.`, userId]);
    categories.set(name, result.rows[0].id);
  }

  for (const game of englishGames) {
    const variant = englishGames.filter((item) => item.type === game.type).findIndex((item) => item.slug === game.slug);
    const created = await pool.query<{ id: string }>(`INSERT INTO gamified_games (slug, title, description, game_type, category_id, created_by, difficulty, estimated_minutes, practice_xp_reward, practice_coin_reward, is_published) VALUES ($1,$2,$3,$4,$5,$6,'beginner',5,50,10,TRUE) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW() RETURNING id`, [game.slug, game.title, game.description, game.type, categories.get(game.category), userId]);
    const gameId = created.rows[0].id;
    if (game.type === "speed_run") {
      const sets = [
        [["Which sentence is correct?", ["She has finished her work.", "She have finished her work.", "She has finish her work.", "She finished has her work."], 0], ["Choose the past tense of go.", ["goed", "gone", "went", "going"], 2], ["Select the correct article: ___ honest person.", ["a", "an", "the", "no article"], 1]],
        [["Closest meaning to rapid?", ["slow", "quick", "late", "quiet"], 1], ["Opposite of ancient?", ["old", "modern", "past", "early"], 1], ["Lucid means:", ["clear", "loud", "dark", "heavy"], 0]],
        [["The main idea is the passage's...", ["central message", "longest sentence", "first word", "title only"], 0], ["A detail that supports an idea is a...", ["clue", "supporting detail", "heading", "fiction"], 1], ["A conclusion is made after...", ["ignoring evidence", "using evidence", "guessing randomly", "skipping text"], 1]],
      ][variant];
      for (let i = 0; i < 3; i++) {
        const question = sets[i]; const q = await pool.query<{ id: string }>(`INSERT INTO gamified_speed_run_questions (game_id,prompt,question_order,points) VALUES ($1,$2,$3,100) ON CONFLICT (game_id,question_order) DO UPDATE SET prompt=EXCLUDED.prompt RETURNING id`, [gameId, question[0], i + 1]);
        for (let c = 0; c < (question[1] as string[]).length; c++) await pool.query(`INSERT INTO gamified_speed_run_choices (question_id,choice_text,choice_order,is_correct) VALUES ($1,$2,$3,$4) ON CONFLICT (question_id,choice_order) DO UPDATE SET choice_text=EXCLUDED.choice_text,is_correct=EXCLUDED.is_correct`, [q.rows[0].id, (question[1] as string[])[c], c + 1, c === question[2]]);
      }
    } else if (game.type === "match_master") {
      const sets = [[['rapid','quick'],['benevolent','kind'],['meticulous','careful']], [['subject','what a sentence is about'],['predicate','what the subject does'],['adjective','describing word']], [['break the ice','start a conversation'],['piece of cake','very easy'],['spill the beans','reveal a secret']]];
      for (let i = 0; i < 3; i++) await pool.query(`INSERT INTO gamified_match_master_pairs (game_id,left_text,right_text,pair_order) VALUES ($1,$2,$3,$4) ON CONFLICT (game_id,pair_order) DO UPDATE SET left_text=EXCLUDED.left_text,right_text=EXCLUDED.right_text`, [gameId, sets[variant][i][0], sets[variant][i][1], i + 1]);
    } else if (game.type === "word_builder") {
      const sets = [[['A place where books are kept','library'],['Past tense of write','wrote'],['Opposite of ancient','modern']], [['A person who teaches','teacher'],['A question word','why'],['Describes a noun','adjective']], [['A story with a lesson','fable'],['Story opponent','villain'],['Time and place of a story','setting']]];
      for (let i = 0; i < 3; i++) { const answer = sets[variant][i][1]; const scrambled = answer.split('').sort(() => 0.5 - Math.random()).join(''); await pool.query(`INSERT INTO gamified_word_builder_challenges (game_id,prompt,answer,scrambled_letters,hint,challenge_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (game_id,challenge_order) DO UPDATE SET prompt=EXCLUDED.prompt,answer=EXCLUDED.answer,scrambled_letters=EXCLUDED.scrambled_letters,hint=EXCLUDED.hint`, [gameId, sets[variant][i][0], answer, scrambled, `Starts with ${answer[0].toUpperCase()}`, i + 1]); }
    } else if (game.type === "memory_flip") {
      const cardSets = [[['1','ubiquitous','everywhere'],['2','lucid','clear'],['3','benevolent','kind']], [['1','noun','person, place, thing'],['2','verb','action word'],['3','adjective','describes a noun']], [['1','metaphor','comparison without like or as'],['2','simile','comparison using like or as'],['3','theme','central message']]]; const cards = cardSets[variant];
      for (let i = 0; i < cards.length; i++) for (const [kind, text] of [["term", cards[i][1]], ["match", cards[i][2]]] as const) await pool.query(`INSERT INTO gamified_memory_flip_cards (game_id,pair_key,card_text,card_kind,card_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (game_id,card_order) DO UPDATE SET card_text=EXCLUDED.card_text,card_kind=EXCLUDED.card_kind`, [gameId, cards[i][0], text, kind, i * 2 + (kind === "match" ? 2 : 1)]);
    } else if (game.type === "boss_battle") {
      const sets = [[['Choose the correct plural of child.','children'],['Choose the past tense of eat.','ate'],['Choose the correct article: ___ orange.','an']], [['What is a synonym for quick?','rapid'],['What is an antonym for noisy?','quiet'],['What does lucid mean?','clear']], [['What is the main idea of a passage?','its central message'],['What supports a main idea?','a supporting detail'],['What should readers do?','use evidence']]];
      for (let i = 0; i < 3; i++) { const stage = await pool.query<{ id: string }>(`INSERT INTO gamified_boss_battle_stages (game_id,stage_order,title,boss_health,boss_name) VALUES ($1,$2,$3,100,$4) ON CONFLICT (game_id,stage_order) DO UPDATE SET title=EXCLUDED.title,boss_name=EXCLUDED.boss_name RETURNING id`, [gameId, i + 1, `Stage ${i + 1}`, ['Grammar Guardian','Word Warden','Reading Dragon'][variant]]); await pool.query(`INSERT INTO gamified_boss_battle_questions (stage_id,question_order,prompt,answer) VALUES ($1,1,$2,$3) ON CONFLICT (stage_id,question_order) DO UPDATE SET prompt=EXCLUDED.prompt,answer=EXCLUDED.answer`, [stage.rows[0].id, sets[variant][i][0], sets[variant][i][1]]); }
    } else {
      const sets = [[['Grammar Gate','Select the correct article: ___ apple','an'],['Tense Bridge','Complete: They ___ finished.','have'],['Castle Library','State the central idea.','the most important point']], [['Word Market','Choose a synonym for happy.','joyful'],['Proverb Path','Complete: Every cloud has a ___.','silver lining'],['Story Camp','What is a setting?','time and place']], [['Clue Trail','What is a main idea?','central message'],['Evidence Hill','What supports an idea?','supporting detail'],['Final Signpost','What should readers do?','use evidence']]];
      for (let i = 0; i < 3; i++) await pool.query(`INSERT INTO gamified_quest_adventure_nodes (game_id,node_order,title,story_text,prompt,answer,scene_key) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (game_id,node_order) DO UPDATE SET title=EXCLUDED.title,story_text=EXCLUDED.story_text,prompt=EXCLUDED.prompt,answer=EXCLUDED.answer,scene_key=EXCLUDED.scene_key`, [gameId, i + 1, sets[variant][i][0], `Your adventure continues through ${sets[variant][i][0]}.`, sets[variant][i][1], sets[variant][i][2], ['castle','market','trail'][variant]]);
    }
  }
  console.log(`Seeded ${englishGames.length} arcade games across six game types.`);
}

main().catch((error) => { console.error("Arcade seed failed:", error); process.exitCode = 1; }).finally(() => pool.end());
