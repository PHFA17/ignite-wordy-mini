import { collection, doc, onSnapshot, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase.js';
import { normalizeWord } from './wordy.js';
import { SEED_PUZZLES } from './wordySeed.js';

const IDS = ['english', 'spanish', 'french'];

function validatePuzzles(courseId, puzzles) {
  if (!IDS.includes(courseId) || !Array.isArray(puzzles) || puzzles.length !== 15) {
    throw new Error('São necessários exatamente 15 desafios por idioma.');
  }
  const mainWords = new Set();
  return puzzles.map((puzzle, index) => {
    if (!puzzle || typeof puzzle !== 'object' || typeof puzzle.mainWord !== 'string' || !Array.isArray(puzzle.validWords)) {
      throw new Error(`Desafio inválido: ${courseId} #${index + 1}.`);
    }
    const mainWord = normalizeWord(puzzle.mainWord);
    if (mainWord.length !== 5 || mainWords.has(mainWord)) {
      throw new Error(`A senha ${mainWord || index + 1} deve ter 5 letras e não pode se repetir.`);
    }
    mainWords.add(mainWord);
    const words = puzzle.validWords.map(word => typeof word === 'string' ? normalizeWord(word) : '');
    if (!words.length || words.length > 250 || words.some(word =>
      word.length < 3 || word.length > 5 || [...word].some(letter => !mainWord.includes(letter))
    )) {
      throw new Error(`Existe uma palavra incompatível com as letras de ${mainWord}.`);
    }
    const validWords = [...new Set([...words, mainWord])];
    return { mainWord, validWords };
  });
}

export function validateCatalog(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('JSON inválido.');
  const data = input.courses || input;
  const result = {};
  for (const courseId of IDS) result[courseId] = validatePuzzles(courseId, data[courseId]);
  return result;
}

export function starterCatalog() {
  return validateCatalog(SEED_PUZZLES);
}

function catalogRef(uid, courseId) {
  return doc(db, 'users', uid, 'wordyCatalog', courseId);
}

export function watchCatalog(uid, onUpdate, onError) {
  if (!db || !uid) return () => {};
  return onSnapshot(collection(db, 'users', uid, 'wordyCatalog'), snapshot => {
    const result = {};
    snapshot.forEach(row => {
      if (!IDS.includes(row.id)) return;
      try { result[row.id] = validatePuzzles(row.id, row.data()?.puzzles); }
      catch (_) { /* Ignore documentos corrompidos sem derrubar a tela. */ }
    });
    onUpdate(result);
  }, onError);
}

/** Primeira entrada: preenche o catálogo privado do usuário, sem substituir alterações. */
export async function ensureStarterCatalog(uid) {
  if (!db || !uid) throw new Error('Firebase indisponível.');
  const prepared = starterCatalog();
  for (const courseId of IDS) {
    const ref = catalogRef(uid, courseId);
    await runTransaction(db, async transaction => {
      const existing = await transaction.get(ref);
      if (!existing.exists()) {
        transaction.set(ref, { courseId, puzzles: prepared[courseId], updatedAt: serverTimestamp() });
      }
    });
  }
}

/** Importa três listas de 15; substitui apenas o catálogo da própria conta. */
export async function importCatalog(uid, input) {
  if (!db || !uid) throw new Error('Faça login antes de importar.');
  const validated = validateCatalog(input);
  const batch = writeBatch(db);
  for (const courseId of IDS) {
    batch.set(catalogRef(uid, courseId), {
      courseId, puzzles: validated[courseId], updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return 45;
}
