export interface CitationTriple {
  prompt: string;
  correctIndex: number;
  options: [string, string, string];
}

export interface JargonSentence {
  text: string;
  jargonIndices: [number, number];
  words: string[];
}

export const CITATION_POOL: CitationTriple[] = [
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 0,
    options: [
      'Haraway (1991) Simians, Cyborgs, and Women, p. 42',
      'Medium post: vibes only',
      'Personal communication, no date',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 1,
    options: [
      'Thread on the discourse',
      'Foucault (1977) Discipline and Punish, p. 88',
      'Someone said something once',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 2,
    options: [
      'Blog: hot take weekly',
      'DM from a friend of a friend',
      'Butler (1990) Gender Trouble, p. 15',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 0,
    options: [
      'Scott (1998) Seeing Like a State, p. 201',
      'Podcast episode 47',
      'Heard it at a mixer',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 1,
    options: [
      'Substack: Part 3 of 12',
      'Du Bois (1903) The Souls of Black Folk, p. 3',
      'Anonymous reviewer',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 2,
    options: [
      'Twitter thread (deleted)',
      'Vibes-based ethnography',
      'Arendt (1951) The Origins of Totalitarianism, p. 310',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 0,
    options: [
      'Kuhn (1962) Structure of Scientific Revolutions, p. 52',
      'LinkedIn thought piece',
      'Office hallway chat',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 1,
    options: [
      'Personal blog circa 2014',
      'hooks (1984) Feminist Theory, p. 9',
      'A guy at a bar',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 2,
    options: [
      'Newsletter: trust me',
      'Oral tradition (uncited)',
      'Benjamin (1968) Illuminations, p. 217',
    ],
  },
  {
    prompt: 'Find a real source. Any real source.',
    correctIndex: 0,
    options: [
      'Fanon (1961) Wretched of the Earth, p. 11',
      'Hot take PDF',
      'Slack message, no archive',
    ],
  },
];

export const JARGON_POOL: JargonSentence[] = [
  {
    text: 'We must leverage synergistic paradigms to disrupt hegemony.',
    words: ['We', 'must', 'leverage', 'synergistic', 'paradigms', 'to', 'disrupt', 'hegemony.'],
    jargonIndices: [2, 3],
  },
  {
    text: 'The discourse requires holistic intersectional praxis today.',
    words: ['The', 'discourse', 'requires', 'holistic', 'intersectional', 'praxis', 'today.'],
    jargonIndices: [3, 5],
  },
  {
    text: 'Our framework operationalizes emergent stakeholder ecosystems.',
    words: ['Our', 'framework', 'operationalizes', 'emergent', 'stakeholder', 'ecosystems.'],
    jargonIndices: [2, 3],
  },
  {
    text: 'They deconstructed normative teleology without reading the footnotes.',
    words: ['They', 'deconstructed', 'normative', 'teleology', 'without', 'reading', 'the', 'footnotes.'],
    jargonIndices: [2, 3],
  },
  {
    text: 'Please center liminal modalities in the grant narrative.',
    words: ['Please', 'center', 'liminal', 'modalities', 'in', 'the', 'grant', 'narrative.'],
    jargonIndices: [2, 3],
  },
  {
    text: 'The seminar invoked posthuman assemblages uncritically.',
    words: ['The', 'seminar', 'invoked', 'posthuman', 'assemblages', 'uncritically.'],
    jargonIndices: [3, 4],
  },
  {
    text: 'We need more robust dialectical materiality in the abstract.',
    words: ['We', 'need', 'more', 'robust', 'dialectical', 'materiality', 'in', 'the', 'abstract.'],
    jargonIndices: [4, 5],
  },
  {
    text: 'Her paper problematizes cartesian metanarratives again.',
    words: ['Her', 'paper', 'problematizes', 'cartesian', 'metanarratives', 'again.'],
    jargonIndices: [3, 4],
  },
  {
    text: 'The panel endorsed rhizomatic epistemologies for lunch.',
    words: ['The', 'panel', 'endorsed', 'rhizomatic', 'epistemologies', 'for', 'lunch.'],
    jargonIndices: [3, 4],
  },
  {
    text: 'Someone said decolonize the syllabus using blockchain.',
    words: ['Someone', 'said', 'decolonize', 'the', 'syllabus', 'using', 'blockchain.'],
    jargonIndices: [5, 6],
  },
];

export function pickContent<T>(pool: T[], seed: number, salt: number): T {
  return pool[(seed + salt) % pool.length]!;
}
