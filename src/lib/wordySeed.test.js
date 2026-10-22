import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_PUZZLES } from './wordySeed.js';

test('o catálogo tem 15 desafios por idioma e apenas palavras formáveis', () => {
  assert.deepEqual(Object.keys(SEED_PUZZLES).sort(), ['english','french','spanish']);
  for (const [courseId, puzzles] of Object.entries(SEED_PUZZLES)) {
    assert.equal(puzzles.length, 15, courseId);
    const unique = new Set();
    for (const {mainWord, validWords} of puzzles) {
      assert.equal(mainWord.length, 5, courseId + ': ' + mainWord);
      assert.match(mainWord, /^[A-Z]{5}$/);
      assert.ok(!unique.has(mainWord), 'senha duplicada: ' + mainWord);
      unique.add(mainWord);
      assert.ok(validWords.includes(mainWord), 'senha ausente da lista: ' + mainWord);
      for (const word of validWords) {
        assert.ok(word.length >= 3 && word.length <= 5, word);
        assert.ok([...word].every(char=>mainWord.includes(char)), mainWord + '/' + word);
      }
    }
  }
});
