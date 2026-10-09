export interface Paper {
  id: string;
  title: string;
  series: string;
  doi: string;
  links: { html: string };
  date: string;
  description: string;
}

// Verified against the Zenodo API 2026-09-23. Every DOI returns HTTP 200 on
// https://zenodo.org/api/records/<id>. Do not add placeholder or unverified
// DOIs — a fabricated citation is worse than none.
export const papers: Paper[] = [

  {
    "id": "zenodo-tetrahedron-grand-unified",
    "title": "The Tetrahedron Protocol: A Grand Unified Theory of Structural Resilience",
    "series": "Quantum Foundations",
    "doi": "10.5281/zenodo.19004485",
    "links": { "html": "https://doi.org/10.5281/zenodo.19004485" },
    "date": "2026-01-26",
    "description": "Extends the Tetrahedron Protocol into a grand unified theory of structural resilience across quantum information, engineering, and quantum biology."
  },
  {
    "id": "zenodo-genesis-whitepaper",
    "title": "Strategic Convergence of Geometric Security and Cognitive Resilience: P31 Labs Genesis Whitepaper",
    "series": "Sovereign Stack",
    "doi": "10.5281/zenodo.19411363",
    "links": { "html": "https://doi.org/10.5281/zenodo.19411363" },
    "date": "2026-04-04",
    "description": "Applied implementation of the Tetrahedron Protocol — six defensive systems including WASI sandbox isolation, the Jitterbug client-side compiler, and Catcher's Mitt."
  },
  {
    "id": "zenodo-consciousness-memory",
    "title": "Consciousness, Memory, and the Architecture of Self-Preservation: Neuroscientific Foundations for Cognitive Prosthetic Design",
    "series": "Cognitive Systems",
    "doi": "10.5281/zenodo.19416491",
    "links": { "html": "https://doi.org/10.5281/zenodo.19416491" },
    "date": "2026-04-04",
    "description": "Third paper in the P31 research trilogy — synthesizes cognitive psychology, computational neuroscience, and digital systems architecture for cognitive prosthetic design."
  },
  {
    "id": "zenodo-procedural-anomalies",
    "title": "Procedural Anomalies, Inchoate Judgments, and ADA Title II Violations in Georgia Domestic Relations Proceedings: A Public Interest Analysis",
    "series": "Civil Rights",
    "doi": "10.5281/zenodo.19432309",
    "links": { "html": "https://doi.org/10.5281/zenodo.19432309" },
    "date": "2026-04-05",
    "description": "Public interest analysis of procedural anomalies in a Georgia Superior Court domestic relations proceeding involving a pro se neurodivergent defendant — ADA Title II, O.C.G.A."
  },
  {
    "id": "zenodo-coercive-control",
    "title": "The Architecture of Coercive Control: Systemic Abuse in High-Conflict Domestic Relations Proceedings",
    "series": "Civil Rights",
    "doi": "10.5281/zenodo.19432313",
    "links": { "html": "https://doi.org/10.5281/zenodo.19432313" },
    "date": "2026-04-05",
    "description": "Case study of coercive control mechanisms in high-conflict proceedings where the targeted individual is neurodivergent — legal weaponization and institutional failure."
  },
  {
    "id": "zenodo-universal-bridge",
    "title": "The Universal Bridge at the Phase Transition: Kuramoto Criticality, Maxwell Rigidity, and the Topology of Neurodivergent Cognition",
    "series": "Nonlinear Dynamics",
    "doi": "10.5281/zenodo.19503542",
    "links": { "html": "https://doi.org/10.5281/zenodo.19503542" },
    "date": "2026-04-10",
    "description": "Fourth in the P31 Research Series — a mathematical framework for cognitive phase transitions in neurodivergent individuals using Kuramoto synchronization and Maxwell rigidity."
  },
  {
    "id": "zenodo-sovereign-stack",
    "title": "The Sovereign Stack: Open-Source Hardware–Software Architecture for Neurodivergent Assistive Technology",
    "series": "Sovereign Stack",
    "doi": "10.5281/zenodo.19782969",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782969" },
    "date": "2026-04-26",
    "description": "Paper XII — the complete hardware-software architecture of the P31 ecosystem, including the Node Zero cognitive prosthetic (ESP32-S3)."
  },
  {
    "id": "zenodo-love-protocol",
    "title": "The L.O.V.E. Protocol: Biometric Consensus and the Financialization of Care in Assistive Technology",
    "series": "Care Economy",
    "doi": "10.5281/zenodo.19782971",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782971" },
    "date": "2026-04-26",
    "description": "Paper XI — a biometric consensus mechanism for quantifying care labor using BLE proximity, HRV coherence, and Soulbound Tokens."
  },
  {
    "id": "zenodo-soulsafe",
    "title": "The SOULSAFE Protocol: High-Reliability Engineering for Human–AI Cognitive Symbiosis",
    "series": "Sovereign Stack",
    "doi": "10.5281/zenodo.19782973",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782973" },
    "date": "2026-04-26",
    "description": "Paper XIX — adapts the U.S. Navy SUBSAFE program for human-AI collaboration quality assurance: the Triad of Cognition and high-reliability organization."
  },
  {
    "id": "zenodo-borderland",
    "title": "The Borderland Strategy and Estuarine Sensory Gating: Environmental Psychology as Cognitive Infrastructure",
    "series": "Environmental Psychology",
    "doi": "10.5281/zenodo.19782977",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782977" },
    "date": "2026-04-26",
    "description": "Paper V — establishes the estuarine environment of St. Marys, Georgia as cognitive infrastructure for the neurodivergent operator."
  },
  {
    "id": "zenodo-topological-history",
    "title": "Topological History of Camden County: Institutional Capture and the K₄ Counter-Architecture",
    "series": "K4 Topology",
    "doi": "10.5281/zenodo.19782979",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782979" },
    "date": "2026-04-26",
    "description": "Paper VI — documents the historical pattern of Wye-topology institutional capture in small-county jurisdictions and proposes K₄ mesh counter-architecture."
  },
  {
    "id": "zenodo-neuro-kinship",
    "title": "Neuro-Kinship and the Impedance Mismatch: Communication Topology Across Divergent Neurotypes",
    "series": "Communication",
    "doi": "10.5281/zenodo.19782981",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782981" },
    "date": "2026-04-26",
    "description": "Paper VII — reframes autistic communication breakdown as an engineering impedance mismatch (Transducer Error) using Milton's Double Empathy Problem."
  },
  {
    "id": "zenodo-value-form",
    "title": "The Value-Form Problem: Self-Domestication, Proactive Strategy, and the L.O.V.E. Use-Value Ledger",
    "series": "Care Economy",
    "doi": "10.5281/zenodo.19782983",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782983" },
    "date": "2026-04-26",
    "description": "Paper VIII — applies the use-value/exchange-value distinction to the measurement of care labor and the L.O.V.E. protocol."
  },
  {
    "id": "zenodo-quantum-social",
    "title": "Quantum Social Science: The Authorized Observer Problem and the Spinning Coin Phenomenology",
    "series": "Quantum Social Science",
    "doi": "10.5281/zenodo.19782985",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782985" },
    "date": "2026-04-26",
    "description": "Paper IX — applies Wendt's quantum social theory as a structural analogy to care measurement and Proof of Care."
  },
  {
    "id": "zenodo-linguistic-thermo",
    "title": "Linguistic Thermodynamics and Synergetic Accounting: The Landauer Limit of Zero-Work Syntax",
    "series": "Information Theory",
    "doi": "10.5281/zenodo.19782987",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782987" },
    "date": "2026-04-26",
    "description": "Paper X — applies Landauer's principle to demonstrate the thermodynamic cost of zero-work linguistic constructs."
  },
  {
    "id": "zenodo-abdication-protocol",
    "title": "The Abdication Protocol and Legal Faraday Cage: Structural Containment for High-Conflict Jurisdictions",
    "series": "Sovereign Stack",
    "doi": "10.5281/zenodo.19782989",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782989" },
    "date": "2026-04-26",
    "description": "Paper XIII — proposes a legal Faraday-cage framing for containing institutional interference in high-conflict jurisdictions."
  },
  {
    "id": "zenodo-centennial-sync",
    "title": "Centennial Sync: Fuller's 50-Year Prediction and the P31 Implementation Timeline",
    "series": "Synergetics",
    "doi": "10.5281/zenodo.19782991",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782991" },
    "date": "2026-04-26",
    "description": "Paper XIV — maps Buckminster Fuller's 50-year adoption-cycle prediction for geodesic housing to the P31 assistive technology timeline."
  },
  {
    "id": "zenodo-resonant-mind",
    "title": "The Resonant Mind: HRV Biofeedback and the 0.1 Hz Cognitive Anchor",
    "series": "Neuroregulation",
    "doi": "10.5281/zenodo.19782993",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782993" },
    "date": "2026-04-26",
    "description": "Paper XV — documents the neuroscience of 0.1 Hz respiratory sinus arrhythmia as a cognitive regulation mechanism."
  },
  {
    "id": "zenodo-incense-metaphor",
    "title": "The Incense Metaphor: Olfactory Anchoring and Ritual in Cognitive Prosthetic Design",
    "series": "Sensory Design",
    "doi": "10.5281/zenodo.19782995",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782995" },
    "date": "2026-04-26",
    "description": "Paper XVI — explores olfactory anchoring and ritual structure in cognitive prosthetic design for neurodivergent users."
  },
  {
    "id": "zenodo-architecture-of-chaos",
    "title": "The Architecture of Chaos: Structured Entropy and the Parking Lot Protocol",
    "series": "Executive Function",
    "doi": "10.5281/zenodo.19782997",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782997" },
    "date": "2026-04-26",
    "description": "Paper XVII — formalizes the parking-lot impulse management protocol as a structured entropy channel for AuDHD executive dysfunction."
  },
  {
    "id": "zenodo-god-dao",
    "title": "The G.O.D. DAO Constitution and the Slashing Engine: Governance Primitives for Assistive-Technology Commons",
    "series": "Governance",
    "doi": "10.5281/zenodo.19782999",
    "links": { "html": "https://doi.org/10.5281/zenodo.19782999" },
    "date": "2026-04-26",
    "description": "Paper XVIII — specifies governance primitives for a decentralized assistive-technology commons, including constitution-level rules and a slashing engine."
  },
  {
    "id": "zenodo-trimtab-declaration",
    "title": "The Trimtab Declaration and Safe Geometry: Minimum Leverage for Maximum Human Flourishing",
    "series": "Design Ethics",
    "doi": "10.5281/zenodo.19783001",
    "links": { "html": "https://doi.org/10.5281/zenodo.19783001" },
    "date": "2026-04-26",
    "description": "Paper XX — states the Trimtab Declaration as minimum-leverage design ethics for neuro-inclusive systems."
  }
];