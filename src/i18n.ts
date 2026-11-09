/**
 * All UI text in English and German. Pure data + tiny helpers, no DOM.
 * Player names, team names and countries come from the data and stay as is.
 */
export type Lang = 'en' | 'de';
export const LANGS: Lang[] = ['en', 'de'];

const en = {
  // shell
  backToTitle: 'Back to title',
  howToPlay: 'How to play',
  statistics: 'Statistics',
  switchTheme: 'Switch colour theme',
  switchLang: 'Deutsch anzeigen',
  langButton: 'DE',
  soundOnLabel: 'Sound on (click to mute)',
  soundOffLabel: 'Sound off (click to unmute)',
  soundOnTitle: 'Sound: on',
  soundOffTitle: 'Sound: off',
  dataSeason: (season: string, sample: boolean) =>
    `DATA: SEASON ${season}${sample ? ' (SAMPLE)' : ''}`,
  disclaimer: 'FAN PROJECT. NOT AFFILIATED WITH THE NBA.',
  skipLink: 'Skip to game',

  // title
  tagline: (n: number) => `GUESS THE NBA PLAYER IN ${n} TRIES`,
  mainMenu: 'Main menu',
  daily: (day: number) => `DAILY #${day}`,
  freePlay: 'FREE PLAY',
  howToPlayMenu: 'HOW TO PLAY',
  statsMenu: 'STATS',
  pressStart: 'PRESS START',

  // game
  gameBoard: 'Game board',
  guessesList: 'Your guesses, newest first',
  guessLabel: 'GUESS A PLAYER:',
  guessButton: 'GUESS',
  placeholder: 'TYPE A NAME...',
  matchingPlayers: 'Matching players',
  livesLabel: (n: number, max: number) => `Guess ${n} of ${max}`,
  pickFirst: 'Pick a player from the list first!',
  alreadyGuessed: (name: string) => `${name} was already guessed!`,
  gameOverError: 'This game is already over.',
  shotTaken: (name: string) => `${name} takes the shot...`,
  left: (n: number) => (n === 1 ? '1 shot left.' : `${n} shots left.`),
  intro: 'Tip-off! A mystery player is on the court. Who is it?',
  welcomeBack: (n: number) => `Back on the court! ${n === 1 ? '1 shot' : `${n} shots`} left.`,
  missLines: [
    'Airball! Not this one.',
    'Clank! Off the back iron.',
    'Blocked! Keep shooting.',
    'In and out... so close, yet no.',
    'Shot clock is ticking!',
  ],
  closeLine: 'Rolling around the rim! You are getting close.',
  win: (name: string) => `Swish! Nothing but net. It was ${name}!`,
  loss: (name: string) => `The buzzer sounds... It was ${name}.`,

  // end of game
  results: 'RESULTS',
  share: 'SHARE',
  newGame: 'NEW GAME',
  youWin: 'YOU WIN!',
  gameOver: 'GAME OVER',
  solvedIn: (n: number, max: number) => `SOLVED IN ${n}/${max}`,
  noLuck: (max: number) => `NO LUCK THIS TIME (X/${max})`,
  photoOf: (name: string) => `Photo of ${name}`,
  noPhoto: 'No photo available',
  nextIn: (t: string) => `NEXT PLAYER IN ${t}`,

  // share menu
  shareTitle: 'SHARE',
  shareNative: 'MORE APPS...',
  copyResult: 'COPY RESULT',
  copyLink: 'COPY LINK',
  copied: 'COPIED!',
  copyFailed: 'COPY FAILED',
  instagramHint: 'RESULT COPIED. PASTE IT INTO YOUR INSTAGRAM MESSAGE OR STORY.',
  email: 'E-MAIL',
  sms: 'SMS',
  copiedAnnounce: 'Copied to clipboard',
  copyFailedAnnounce: 'Could not copy to clipboard',
  shareInvite: 'Can you guess the NBA player? Play HOOPDLE:',

  // stats
  statsTitle: 'STATISTICS',
  played: 'PLAYED',
  winPct: 'WIN %',
  streak: 'STREAK',
  maxStreak: 'MAX',
  distribution: 'GUESS DISTRIBUTION',
  distributionLabel: 'Wins by number of guesses',
  distRow: (i: number, n: number) => `${i} guesses: ${n} wins`,
  statsNote: 'STATS COUNT DAILY GAMES ON THIS DEVICE.',

  // board
  headers: {
    team: ['TEAM', 'Team'],
    position: ['POS', 'Position'],
    height: ['HT', 'Height'],
    age: ['AGE', 'Age'],
    jersey: ['NO.', 'Jersey number'],
    country: ['NAT', 'Country'],
  },
  verdict: { green: 'match', yellow: 'close', gray: 'miss' },
  secretHigher: 'secret is higher',
  secretLower: 'secret is lower',
  division: (d: string) => `${d} division`,
  east: 'EAST',
  west: 'WEST',

  // help
  helpTitle: 'HOW TO PLAY',
  helpGoal: (n: number) => `FIND THE SECRET NBA PLAYER IN ${n} GUESSES.`,
  helpHow: 'TYPE A NAME, PICK A PLAYER FROM THE LIST. EACH GUESS SHOWS HOW CLOSE YOU ARE:',
  green: 'GREEN',
  yellow: 'YELLOW',
  dark: 'DARK',
  exact: '= EXACT MATCH',
  close: '= CLOSE',
  noMatch: '= NO MATCH',
  rules: (t: { heightInches: number; ageYears: number; jersey: number }) => [
    'TEAM: YELLOW = SAME DIVISION. THE SMALL TEXT SHOWS CONFERENCE AND DIVISION OF YOUR GUESS.',
    'POS: YELLOW = SHARES A POSITION (G VS G-F).',
    `HT: YELLOW = WITHIN ${t.heightInches} INCHES.`,
    `AGE: YELLOW = WITHIN ${t.ageYears} YEARS.`,
    `NO.: YELLOW = JERSEY WITHIN ${t.jersey}.`,
    'NAT: YELLOW = SAME CONTINENT.',
    'ARROWS SHOW IF THE SECRET VALUE IS HIGHER OR LOWER.',
  ],
  example: 'EXAMPLE',
  helpModes:
    'DAILY: SAME PLAYER FOR EVERYONE, NEW ONE AT MIDNIGHT (LOCAL TIME). FREE PLAY: UNLIMITED RANDOM ROUNDS.',
  close_: 'Close',

  // screen reader descriptions
  a11y: {
    labels: {
      team: 'Team',
      position: 'Position',
      height: 'Height',
      age: 'Age',
      jersey: 'Number',
      country: 'Country',
    },
    correctPlayer: (name: string) => `${name}. Correct, that is the player!`,
    correct: 'correct',
    wrong: 'wrong',
    sameDivision: 'wrong, same division',
    partly: 'partly right',
    sameContinent: 'wrong, same continent',
    closeWord: 'close',
    higher: 'higher',
    lower: 'lower',
    east: 'East',
    west: 'West',
    feet: (ft: number, inch: number) => `${ft} feet ${inch}`,
  },
};

export type Strings = typeof en;

const de: Strings = {
  backToTitle: 'Zurück zum Titel',
  howToPlay: 'Spielanleitung',
  statistics: 'Statistik',
  switchTheme: 'Farbschema wechseln',
  switchLang: 'Show in English',
  langButton: 'EN',
  soundOnLabel: 'Ton an (klicken zum Stummschalten)',
  soundOffLabel: 'Ton aus (klicken zum Einschalten)',
  soundOnTitle: 'Ton: an',
  soundOffTitle: 'Ton: aus',
  dataSeason: (season, sample) => `DATEN: SAISON ${season}${sample ? ' (BEISPIEL)' : ''}`,
  disclaimer: 'FAN-PROJEKT. KEINE VERBINDUNG ZUR NBA.',
  skipLink: 'Zum Spiel springen',

  tagline: (n) => `ERRATE DEN NBA-SPIELER IN ${n} VERSUCHEN`,
  mainMenu: 'Hauptmenü',
  daily: (day) => `TAGES-RÄTSEL #${day}`,
  freePlay: 'FREIES SPIEL',
  howToPlayMenu: 'ANLEITUNG',
  statsMenu: 'STATISTIK',
  pressStart: 'START DRÜCKEN',

  gameBoard: 'Spielfeld',
  guessesList: 'Deine Tipps, neuester zuerst',
  guessLabel: 'SPIELER RATEN:',
  guessButton: 'TIPP',
  placeholder: 'NAME EINGEBEN...',
  matchingPlayers: 'Passende Spieler',
  livesLabel: (n, max) => `Versuch ${n} von ${max}`,
  pickFirst: 'Wähle zuerst einen Spieler aus der Liste!',
  alreadyGuessed: (name) => `${name} hast du schon getippt!`,
  gameOverError: 'Dieses Spiel ist schon vorbei.',
  shotTaken: (name) => `${name} nimmt den Wurf...`,
  left: (n) => (n === 1 ? 'Noch 1 Wurf.' : `Noch ${n} Würfe.`),
  intro: 'Sprungball! Ein geheimer Spieler steht auf dem Feld. Wer ist es?',
  welcomeBack: (n) => `Zurück auf dem Feld! Noch ${n === 1 ? '1 Wurf' : `${n} Würfe`}.`,
  missLines: [
    'Airball! Der war es nicht.',
    'Klonk! Hinten am Ring.',
    'Geblockt! Weiter werfen.',
    'Rein und wieder raus... knapp daneben.',
    'Die Wurfuhr tickt!',
  ],
  closeLine: 'Der Ball tanzt auf dem Ring! Du bist nah dran.',
  win: (name) => `Swish! Nur Netz. Es war ${name}!`,
  loss: (name) => `Die Schlusssirene ertönt... Es war ${name}.`,

  results: 'ERGEBNIS',
  share: 'TEILEN',
  newGame: 'NEUES SPIEL',
  youWin: 'GEWONNEN!',
  gameOver: 'SPIEL VORBEI',
  solvedIn: (n, max) => `GELÖST IN ${n}/${max}`,
  noLuck: (max) => `DIESMAL KEIN GLÜCK (X/${max})`,
  photoOf: (name) => `Foto von ${name}`,
  noPhoto: 'Kein Foto verfügbar',
  nextIn: (t) => `NÄCHSTER SPIELER IN ${t}`,

  shareTitle: 'TEILEN',
  shareNative: 'WEITERE APPS...',
  copyResult: 'ERGEBNIS KOPIEREN',
  copyLink: 'LINK KOPIEREN',
  copied: 'KOPIERT!',
  copyFailed: 'FEHLER',
  instagramHint: 'ERGEBNIS KOPIERT. FÜGE ES IN DEINE INSTAGRAM-NACHRICHT ODER STORY EIN.',
  email: 'E-MAIL',
  sms: 'SMS',
  copiedAnnounce: 'In die Zwischenablage kopiert',
  copyFailedAnnounce: 'Kopieren fehlgeschlagen',
  shareInvite: 'Errätst du den NBA-Spieler? Spiel HOOPDLE:',

  statsTitle: 'STATISTIK',
  played: 'SPIELE',
  winPct: 'SIEG %',
  streak: 'SERIE',
  maxStreak: 'MAX',
  distribution: 'VERTEILUNG DER VERSUCHE',
  distributionLabel: 'Siege nach Anzahl der Versuche',
  distRow: (i, n) => `${i} Versuche: ${n} Siege`,
  statsNote: 'ZÄHLT TAGES-RÄTSEL AUF DIESEM GERÄT.',

  headers: {
    team: ['TEAM', 'Team'],
    position: ['POS', 'Position'],
    height: ['GR.', 'Größe'],
    age: ['ALTER', 'Alter'],
    jersey: ['NR.', 'Trikotnummer'],
    country: ['LAND', 'Land'],
  },
  verdict: { green: 'Treffer', yellow: 'nah dran', gray: 'daneben' },
  secretHigher: 'gesuchter Wert ist höher',
  secretLower: 'gesuchter Wert ist niedriger',
  division: (d) => `${d}-Division`,
  east: 'OST',
  west: 'WEST',

  helpTitle: 'ANLEITUNG',
  helpGoal: (n) => `FINDE DEN GEHEIMEN NBA-SPIELER IN ${n} VERSUCHEN.`,
  helpHow:
    'GIB EINEN NAMEN EIN UND WÄHLE EINEN SPIELER AUS DER LISTE. JEDER TIPP ZEIGT, WIE NAH DU DRAN BIST:',
  green: 'GRÜN',
  yellow: 'GELB',
  dark: 'DUNKEL',
  exact: '= GENAU RICHTIG',
  close: '= NAH DRAN',
  noMatch: '= DANEBEN',
  rules: (t) => [
    'TEAM: GELB = GLEICHE DIVISION. DER KLEINE TEXT ZEIGT CONFERENCE UND DIVISION DEINES TIPPS.',
    'POS: GELB = EINE POSITION STIMMT (G VS G-F).',
    `GR.: GELB = HÖCHSTENS ${t.heightInches} ZOLL UNTERSCHIED.`,
    `ALTER: GELB = HÖCHSTENS ${t.ageYears} JAHRE UNTERSCHIED.`,
    `NR.: GELB = TRIKOTNUMMER HÖCHSTENS ${t.jersey} DANEBEN.`,
    'LAND: GELB = GLEICHER KONTINENT.',
    'PFEILE ZEIGEN, OB DER GESUCHTE WERT HÖHER ODER NIEDRIGER IST.',
  ],
  example: 'BEISPIEL',
  helpModes:
    'TAGES-RÄTSEL: GLEICHER SPIELER FÜR ALLE, UM MITTERNACHT (ORTSZEIT) KOMMT EIN NEUER. FREIES SPIEL: UNBEGRENZT ZUFÄLLIGE RUNDEN.',
  close_: 'Schließen',

  a11y: {
    labels: {
      team: 'Team',
      position: 'Position',
      height: 'Größe',
      age: 'Alter',
      jersey: 'Nummer',
      country: 'Land',
    },
    correctPlayer: (name) => `${name}. Richtig, das ist der gesuchte Spieler!`,
    correct: 'richtig',
    wrong: 'falsch',
    sameDivision: 'falsch, gleiche Division',
    partly: 'teilweise richtig',
    sameContinent: 'falsch, gleicher Kontinent',
    closeWord: 'nah dran',
    higher: 'höher',
    lower: 'niedriger',
    east: 'Ost',
    west: 'West',
    feet: (ft, inch) => `${ft} Fuß ${inch}`,
  },
};

const DICT: Record<Lang, Strings> = { en, de };

export function strings(lang: Lang): Strings {
  return DICT[lang];
}

/** Picks the initial language: saved choice, else browser language (German -> de). */
export function detectLang(saved: unknown, browserLangs: readonly string[]): Lang {
  if (saved === 'en' || saved === 'de') return saved;
  return browserLangs.some((l) => l.toLowerCase().startsWith('de')) ? 'de' : 'en';
}

/** Short division labels for narrow team tiles. */
export function divisionShort(division: string): string {
  const map: Record<string, string> = {
    Atlantic: 'ATLAN',
    Central: 'CENT',
    Southeast: 'S-EAST',
    Northwest: 'N-WEST',
    Pacific: 'PAC',
    Southwest: 'S-WEST',
  };
  return map[division] ?? division.slice(0, 5).toUpperCase();
}
