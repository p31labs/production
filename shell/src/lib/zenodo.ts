import { storeRecord, loadRecord } from './memory';

const ZENODO_CACHE_KEY = 'zenodo-papers';
const ZENODO_API = 'https://zenodo.org/api/records?q=metadata.creators.person_or_org.name:%22Johnson,%20William%20R.%22&size=25&sort=bestmatch';

export interface ZenodoPaper {
  id: string;
  doi: string;
  title: string;
  description: string;
  date: string;
  links: { html: string; doi: string };
  creators: Array<{ name: string }>;
}

interface ZenodoResponse {
  hits: {
    total: number;
    hits: Array<{
      id: string;
      doi: string;
      metadata: {
        title: string;
        description: string;
        publication_date: string;
        creators: Array<{ name: string }>;
      };
      links: { html: string; doi: string };
    }>;
  };
}

export const MATH_MAP: Record<string, { label: string; description: string }> = {
  'Tetrahedron': {
    label: 'SIC‑POVM d=2',
    description: 'Running verifySicPovm() shows overlap = 1/3 and trace = 1 across the Weyl‑Heisenberg orbit.',
  },
  'Posner': {
    label: 'Posner Molecule',
    description: 'posnerAtoms() distributes 9 Ca + 6 P + 24 O at bond radius 1.9 Å; updatePosnerCoherence() models quantum biosignatures.',
  },
  'K4': {
    label: 'K₄ Planar Graph',
    description: 'K4Graph traverses the complete 4‑vertex graph — the Minimum Energy sub‑graph at 4 vertices.',
  },
  'Quantum': {
    label: 'Quantum Social Science',
    description: 'sicPovmProbabilities() applies the SIC‑POVM measurement to a density matrix; measureShipState() collapses via von Neumann entropy.',
  },
  'Landauer': {
    label: 'Von Neumann Entropy',
    description: 'vonNeumannEntropy(rho) computes S(ρ) = −Tr(ρ ln ρ) — the thermodynamic minimum energy cost of irreversible computation.',
  },
  'Kuramoto': {
    label: 'Morphogenetic Field',
    description: 'computeMorphogeneticField() implements cliffordRotation() + morphogenetic layer — the Kuramoto phase oscillator model applied to neurodivergent cognition.',
  },
  'Genesis': {
    label: 'D20 + Bandit + Edge Adaptation',
    description: 'd20Select() (stochastic selection), contextualBanditSelect() (Thompson sampling), and computeAdaptation() (edge‑case learning) — the Genesis Whitepaper stack.',
  },
  'SOULSAFE': {
    label: 'Ship State Engine',
    description: 'measureShipState(densityMatrix) collapses the SHIP‑modes across High‑Fidelity / Idle / Low‑Power; verifyStateEngine() runs the full quality‑assurance circuit.',
  },
};

export async function fetchZenodoPapers(): Promise<ZenodoPaper[]> {
  try {
    const res = await fetch(ZENODO_API);
    if (!res.ok) return [];
    const body = (await res.json()) as ZenodoResponse;
    return body.hits.hits.map((h) => ({
      id: h.id,
      doi: h.doi,
      title: h.metadata.title,
      description: h.metadata.description?.slice(0, 400) ?? '',
      date: h.metadata.publication_date,
      links: h.links,
      creators: h.metadata.creators ?? [],
    }));
  } catch {
    return [];
  }
}

export async function getCachedPapers(): Promise<ZenodoPaper[]> {
  try {
    const cached = await loadRecord<{ id: string; papers: ZenodoPaper[]; ts: number }>('memory', ZENODO_CACHE_KEY);
    if (cached && Date.now() - cached.ts < 24 * 60 * 60 * 1000) return cached.papers;
  } catch { /* not cached */ }

  const papers = await fetchZenodoPapers();
  if (papers.length) {
    storeRecord('memory', { id: ZENODO_CACHE_KEY, papers, ts: Date.now() }).catch(() => {});
  }
  return papers;
}

export function mapPaperToMath(paper: ZenodoPaper): string[] {
  const t = paper.title + ' ' + (paper.description ?? '');
  const keys: string[] = [];
  for (const [keyword, { label }] of Object.entries(MATH_MAP)) {
    if (t.toLowerCase().includes(keyword.toLowerCase())) keys.push(label);
  }
  return keys;
}
