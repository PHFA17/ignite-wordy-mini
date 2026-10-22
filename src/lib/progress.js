import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeWord, getPuzzle } from './wordy';

export const emptyProgress = () => ({foundWords: [], mainFound: false});

function progressRef(uid, puzzle) {
  return doc(db, 'users', uid, 'wordyProgress', `${puzzle.courseId}_${puzzle.dateKey}`);
}

// Escuta o documento de forma contínua: trocas de aparelho também sincronizam.
export function watchProgress(uid, puzzle, onUpdate, onError) {
  if (!db || !uid) return () => {};
  return onSnapshot(progressRef(uid,puzzle), snapshot => {
    const data = snapshot.data() || {};
    const accepted = new Set(puzzle.validWords);
    // Um catálogo importado pode trocar a senha do mesmo dia.
    // Progresso legado sem puzzleWord só pertence à senha antiga do código.
    const expected = normalizeWord(data.puzzleWord || getPuzzle(puzzle.courseId).mainWord);
    const matching = expected === puzzle.mainWord;
    onUpdate({
      foundWords: [...new Set((matching && Array.isArray(data.foundWords)?data.foundWords:[])
        .map(normalizeWord).filter(w => accepted.has(w) && w!==puzzle.mainWord))],
      mainFound: matching && Boolean(data.mainFound),
    });
  }, onError);
}

// Transação preserva o progresso, inclusive quando dois aparelhos gravam juntos.
export async function recordWord(uid, puzzle, word) {
  if (!db || !uid) throw new Error('Firebase não configurado.');
  const normalized = normalizeWord(word);
  if (!puzzle.validWords.includes(normalized)) throw new Error('Palavra inválida.');
  const ref = progressRef(uid,puzzle);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.data() || {};
    const accepted = new Set(puzzle.validWords);
    const matching = normalizeWord(previous.puzzleWord || getPuzzle(puzzle.courseId).mainWord) === puzzle.mainWord;
    const foundWords = [...new Set((matching && Array.isArray(previous.foundWords)?previous.foundWords:[])
      .map(normalizeWord).filter(w=>accepted.has(w)&&w!==puzzle.mainWord))];
    if(normalized!==puzzle.mainWord && !foundWords.includes(normalized))foundWords.push(normalized);
    transaction.set(ref, {
      courseId: puzzle.courseId,
      dateKey: puzzle.dateKey,
      puzzleWord: puzzle.mainWord,
      updatedAt: serverTimestamp(),
      foundWords,
      mainFound: Boolean((matching && previous.mainFound) || normalized===puzzle.mainWord),
    });
  });
}
