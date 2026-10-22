import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_PUZZLES, getPuzzle, shuffleLetters, normalizeWord, canGrow, remainingWords } from './wordy.js';

test('normaliza acentos e letras especiais',()=>{
  assert.equal(normalizeWord('sœur'),'SOEUR');
  assert.equal(normalizeWord('ação'),'ACAO');
});
test('as palavras diárias têm cinco letras, são válidas e podem reutilizar letras',()=>{
  for(const course of Object.keys(DAILY_PUZZLES)) {
    for(let day=0;day<7;day++) {
      const puzzle=getPuzzle(course,new Date(2026,9,21+day));
      assert.equal(puzzle.mainWord.length,5);
      assert.ok(puzzle.validWords.includes(puzzle.mainWord));
      assert.ok(puzzle.validWords.every(word=>word.length>=3&&word.length<=5));
      assert.ok(puzzle.validWords.every(word=>[...word].every(l=>puzzle.letters.includes(l))));
    }
  }
});
test('embaralhamento estável não entrega a senha',()=>{
  const letters=[...'REACT'];
  assert.deepEqual(shuffleLetters(letters,'REACT:test'),shuffleLetters(letters,'REACT:test'));
  assert.notDeepEqual(shuffleLetters(letters,'REACT:test'),letters);
});
test('TEA pode crescer para TEAR sem ser apagada',()=>{
  const puzzle=DAILY_PUZZLES.english[0];
  assert.equal(canGrow('TEA',puzzle),true);
  assert.equal(canGrow('REACT',puzzle),false);
});
test('lista de faltantes oculta as respostas',()=>{
  const puzzle={validWords:['TEA','TEAR','REACT']};
  assert.deepEqual(remainingWords(puzzle,['TEA']),[{size:4,count:1},{size:5,count:1}]);
});
