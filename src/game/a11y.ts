import { spokenHeight } from './format';
import type { AttributeResult, GuessResult } from './types';

const LABEL: Record<AttributeResult['key'], string> = {
  team: 'Team',
  position: 'Position',
  height: 'Height',
  age: 'Age',
  jersey: 'Number',
  country: 'Country',
};

function describe(a: AttributeResult, heightInches: number): string {
  const value = a.key === 'height' ? spokenHeight(heightInches) : a.display;
  let verdict: string;
  if (a.feedback === 'green') verdict = 'correct';
  else if (a.key === 'team') verdict = a.feedback === 'yellow' ? 'wrong, same division' : 'wrong';
  else if (a.key === 'position') verdict = a.feedback === 'yellow' ? 'partly right' : 'wrong';
  else if (a.key === 'country')
    verdict = a.feedback === 'yellow' ? 'wrong, same continent' : 'wrong';
  else {
    const close = a.feedback === 'yellow' ? 'close, ' : '';
    verdict = a.direction ? `${close}${a.direction === 'up' ? 'higher' : 'lower'}` : 'close';
  }
  return `${LABEL[a.key]} ${value}: ${verdict}.`;
}

/** Plain text summary for the ARIA live region. */
export function describeGuess(name: string, result: GuessResult, heightInches: number): string {
  if (result.correct) return `${name}. Correct, that is the player!`;
  return `${name}. ${result.attributes.map((a) => describe(a, heightInches)).join(' ')}`;
}
