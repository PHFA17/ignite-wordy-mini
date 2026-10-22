/**
 * Jogo adaptado de PHFA17/Ignite — Wordy.
 * Regras mantidas: 5 letras na senha principal, palavras de 3 a 5 letras,
 * reutilização de letras, reconhecimento de prefixos e rodada diária por curso.
 * O catálogo local é compacto; não depende da API/MySQL do Ignite original.
 */
export const COURSES = {
  english: 'Inglês', spanish: 'Espanhol', french: 'Francês',
};

export const DAILY_PUZZLES = {
  english: [
    { mainWord: 'REACT', validWords: ['ACT','ARC','ARE','ART','ATE','CAR','CARE','CART','CAT','CATER','CRATE','EAT','ERA','RACE','RATE','REACT','TAR','TARE','TEA','TEAR','TRACE'] },
    { mainWord: 'STONE', validWords: ['EON','EONS','NEST','NET','NETS','NOSE','NOTE','NOTES','ONE','ONES','SENT','SET','SON','SOON','SOOT','STONE','TEN','TENS','TOE','TOES','TON','TONE','TONES','TOO'] },
    { mainWord: 'LIGHT', validWords: ['GIG','GILL','GILT','HIGH','HILL','HILT','HIT','LIGHT','LILT','LIT','THIGH','TIGHT','TILL','TILT'] },
    { mainWord: 'BRAIN', validWords: ['AIR','BAN','BAR','BARN','BIN','BRAIN','BRAN','BRIAR','NAB','RAIN','RAN','RIB'] },
    { mainWord: 'CLOUD', validWords: ['CLOD','CLOUD','COLD','COOL','COULD','CUD','CULL','DULL','DUO','LOUD','ODD','OLD'] },
    { mainWord: 'SMILE', validWords: ['ELM','ILL','LIE','LIES','LIME','LIMES','MILE','MILES','MISS','SLIM','SLIME','SMELL','SMILE'] },
    { mainWord: 'PLANE', validWords: ['APPLE','EEL','LANE','LEAN','NAP','PALE','PANEL','PANE','PEAL','PEEL','PEN','PENAL','PLAN','PLANE'] },
  ],
  spanish: [
    { mainWord: 'RADIO', validWords: ['DAR','DIA','ODIAR','OIR','RADIO','RIO'] },
    { mainWord: 'CLARO', validWords: ['ARCO','CALOR','CARA','CLARO','COLA','CORO','ORAL'] },
    { mainWord: 'NUEVO', validWords: ['NUEVO','UNO','VEO'] },
    { mainWord: 'SALIR', validWords: ['ISLA','LIRA','LISA','RISA','SAL','SALIR'] },
    { mainWord: 'MUNDO', validWords: ['DON','MODO','MUNDO','NUDO','UNO'] },
    { mainWord: 'PARED', validWords: ['DAR','PADRE','PARED','PERA','RED'] },
    { mainWord: 'TIGRE', validWords: ['REIR','TIGRE'] },
  ],
  french: [
    { mainWord: 'TABLE', validWords: ['BAL','BALLE','TABLE'] },
    { mainWord: 'ROUGE', validWords: ['ROUE','ROUGE','RUE'] },
    { mainWord: 'LIVRE', validWords: ['LIRE','LIVRE','RIVE','VIE'] },
    { mainWord: 'PLUME', validWords: ['PLUME','PLUS'] },
    { mainWord: 'CARTE', validWords: ['ACTE','CAR','CARTE','RACE','TRACE'] },
    { mainWord: 'NUAGE', validWords: ['AGE','ANGE','NUAGE'] },
    { mainWord: 'FLEUR', validWords: ['FEU','FLEUR','LEUR','RUE'] },
  ],
};

export function normalizeWord(value = '') {
  return String(value).replace(/[œŒ]/g, 'OE').replace(/[æÆ]/g,'AE')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/[^A-Z]/g,'');
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function getPuzzle(courseId = 'english', date = new Date()) {
  const course = DAILY_PUZZLES[courseId] ? courseId : 'english';
  const puzzles = DAILY_PUZZLES[course];
  const offset = course === 'spanish' ? 2 : course === 'french' ? 4 : 0;
  const index = Math.abs(Math.floor(new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime()/86400000) + offset) % puzzles.length;
  const source = puzzles[index];
  const mainWord = normalizeWord(source.mainWord);
  const letters = [...mainWord];
  const available = new Set(letters);
  const validWords = [...new Set([...source.validWords,mainWord].map(normalizeWord))]
    .filter(word => word.length >= 3 && word.length <= 5 && [...word].every(letter=>available.has(letter)));
  return { courseId: course, dateKey: localDateKey(date), mainWord, letters, validWords };
}

// Sorteio estável do tabuleiro; a senha não pode ficar na ordem correta.
export function shuffleLetters(letters, seed = '') {
  const result = [...letters];
  if (result.length < 2) return result;
  let state = 0;
  for (const char of String(seed || letters.join(''))) state = ((state << 5) - state + char.charCodeAt(0)) | 0;
  function random() {
    state = (state + 0x6d2b79f5) | 0;
    let val = Math.imul(state ^ (state >>> 15), 1 | state);
    val = (val + Math.imul(val ^ (val >>> 7), 61 | val)) ^ val;
    return ((val ^ (val >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  if (result.every((l,i)=>l===letters[i])) result.push(result.shift());
  return result;
}

export function canGrow(word, puzzle) {
  return puzzle.validWords.some(valid => valid.length > word.length && valid.startsWith(word));
}

export function remainingWords(puzzle, foundWords) {
  const found = new Set(foundWords);
  const words = [...new Set(puzzle.validWords)].filter(w => !found.has(w))
    .sort((a,b)=>a.length - b.length || a.localeCompare(b));
  return Object.entries(Object.groupBy(words, w => String(w.length)))
    .map(([size,items])=>({size:Number(size), count:items.length}));
}
