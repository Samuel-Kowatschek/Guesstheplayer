import type { Strings } from '../i18n';
import type { AttributeResult, GuessResult } from './types';

type A11yStrings = Strings['a11y'];

function describe(a: AttributeResult, heightInches: number, s: A11yStrings): string {
  let value = a.display;
  if (a.key === 'height') value = s.feet(Math.floor(heightInches / 12), heightInches % 12);
  if (a.key === 'team' && a.detail) {
    value = `${a.display} (${a.sub === 'East' ? s.east : s.west}, ${a.detail})`;
  }

  let verdict: string;
  if (a.feedback === 'green') verdict = s.correct;
  else if (a.key === 'team') verdict = a.feedback === 'yellow' ? s.sameDivision : s.wrong;
  else if (a.key === 'position') verdict = a.feedback === 'yellow' ? s.partly : s.wrong;
  else if (a.key === 'country') verdict = a.feedback === 'yellow' ? s.sameContinent : s.wrong;
  else {
    const close = a.feedback === 'yellow' ? `${s.closeWord}, ` : '';
    verdict = a.direction ? `${close}${a.direction === 'up' ? s.higher : s.lower}` : s.closeWord;
  }
  return `${s.labels[a.key]} ${value}: ${verdict}.`;
}

/** Plain text summary for the ARIA live region. */
export function describeGuess(
  name: string,
  result: GuessResult,
  heightInches: number,
  s: A11yStrings,
): string {
  if (result.correct) return s.correctPlayer(name);
  return `${name}. ${result.attributes.map((a) => describe(a, heightInches, s)).join(' ')}`;
}
