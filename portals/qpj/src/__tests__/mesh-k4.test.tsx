import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MeshK4 } from '../components/MeshK4';
import { PicklePlaceholder } from '../components/PicklePlaceholder';
import { useQpjStore } from '../store/useQpjStore';

beforeEach(() => {
  useQpjStore.setState({
    mode: 'spark',
    passportId: 'dillpickle',
    caregiverPin: '1234',
    toast: null,
      presence: {
        dillpickle: { did: 'qpj:dillpickle:seed', online: true, lastSeen: Date.now() },
        breadbutter: { did: 'qpj:breadbutter:seed', online: true, lastSeen: Date.now() },
        cornichon: { did: 'qpj:cornichon:seed', online: false, lastSeen: Date.now() },
        gherkin: { did: 'qpj:gherkin:seed', online: true, lastSeen: Date.now() },
      },
    meshStatus: 'online',
  });
});

afterEach(() => cleanup());

describe('MeshK4 component', () => {
  it('renders the K₄ tetrahedron', () => {
    render(<MeshK4 />);
    const svg = document.querySelector('.mesh');
    expect(svg).toBeTruthy();
  });

  it('renders exactly 4 nodes', () => {
    render(<MeshK4 />);
    const nodes = document.querySelectorAll('.mesh__node');
    expect(nodes.length).toBe(4);
  });

  it('renders exactly 6 edges', () => {
    render(<MeshK4 />);
    const edges = document.querySelectorAll('.mesh__edge');
    expect(edges.length).toBe(6);
  });

  it('uses pickle names, not human names', () => {
    render(<MeshK4 />);
    const names = document.querySelectorAll('.mesh__node-name');
    const textContents = Array.from(names).map((n) => n.textContent ?? '');
    expect(textContents).toContain('Dillpickle');
    expect(textContents).toContain('Bread & Butter');
    expect(textContents).toContain('Cornichon');
    expect(textContents).toContain('Gherkin');
    expect(textContents).toContain('Dillpickle');
    expect(textContents).toContain('Bread & Butter');
    expect(textContents).toContain('Cornichon');
    expect(textContents).toContain('Gherkin');
  });

  it('applies weight classes correctly', () => {
    render(<MeshK4 />);
    const w2 = document.querySelectorAll('.mesh__edge--w2');
    const w1 = document.querySelectorAll('.mesh__edge--w1');
    const w0 = document.querySelectorAll('.mesh__edge--w0');
      // Dillpickle, Bread & Butter, Gherkin online → 3 strong edges among them
    expect(w2.length).toBe(3);
      // Cornichon offline → 3 medium edges (one endpoint cornichon, one online)
    expect(w1.length).toBe(3);
    expect(w0.length).toBe(0);
  });

  it('renders placeholder when mesh is idle', () => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      presence: {
        dillpickle: { did: 'qpj:dillpickle:seed', online: false, lastSeen: 0 },
        breadbutter: { did: 'qpj:breadbutter:seed', online: false, lastSeen: 0 },
        cornichon: { did: 'qpj:cornichon:seed', online: false, lastSeen: 0 },
        gherkin: { did: 'qpj:gherkin:seed', online: false, lastSeen: 0 },
      },
      meshStatus: 'idle',
    });

    render(<MeshK4 />);
    const placeholder = document.querySelector('.pickle-placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder?.getAttribute('data-placeholder')).toBe('true');
    expect(placeholder?.getAttribute('data-pickle-kind')).toBe('mesh');
  });

  it('includes ARIA labels on nodes', () => {
    render(<MeshK4 />);
    const nodes = document.querySelectorAll('.mesh__node[aria-label]');
    expect(nodes.length).toBe(4);
    const firstLabel = (nodes[0] as HTMLElement)?.getAttribute('aria-label') ?? '';
    expect(firstLabel).toContain('Dillpickle');
  });

  it('includes SVG title and desc', () => {
    render(<MeshK4 />);
    const title = document.getElementById('mesh-title');
    const desc = document.getElementById('mesh-desc');
    expect(title).toBeTruthy();
    expect(desc).toBeTruthy();
  });

  it('includes pickle emoji on nodes', () => {
    render(<MeshK4 />);
    const emojis = document.querySelectorAll('.mesh__node-emoji');
    expect(emojis.length).toBe(4);
  });

  it('shows online presence class', () => {
    render(<MeshK4 />);
    const onlineNodes = document.querySelectorAll('.mesh__node.is-online');
    expect(onlineNodes.length).toBe(3);
  });
});

describe('PicklePlaceholder component', () => {
  it('renders with kind and reason', () => {
    render(<PicklePlaceholder kind="mesh" reason="testing placeholder" />);
    const el = document.querySelector('.pickle-placeholder');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('data-placeholder')).toBe('true');
    expect(el?.getAttribute('data-pickle-kind')).toBe('mesh');
  });

  it('renders all pickle kinds', () => {
    const kinds: Array<'mesh-node' | 'sbt' | 'passport' | 'sensory' | 'mesh'> = [
      'mesh-node',
      'sbt',
      'passport',
      'sensory',
      'mesh',
    ];
    kinds.forEach((kind) => {
      render(<PicklePlaceholder kind={kind} reason="" />);
      const el = document.querySelector('.pickle-placeholder');
      expect(el).toBeTruthy();
    });
  });

  it('shows reason text', () => {
    render(<PicklePlaceholder kind="mesh-node" reason="a pickle is waiting" />);
    expect(document.body.textContent).toContain('a pickle is waiting');
  });

  it('shows jar emoji', () => {
    render(<PicklePlaceholder kind="mesh" reason="" />);
    expect(document.body.textContent).toContain('🥒');
  });
});

describe('MeshK4 — store integration', () => {
  it('reflects presence from store', () => {
    render(<MeshK4 />);
    const onlineNodes = document.querySelectorAll('.mesh__node.is-online');
    expect(onlineNodes.length).toBe(3);
  });

  it('shows 4 pickles when all online', () => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      presence: {
        dillpickle: { did: 'qpj:dillpickle:seed', online: true, lastSeen: Date.now() },
        breadbutter: { did: 'qpj:breadbutter:seed', online: true, lastSeen: Date.now() },
        cornichon: { did: 'qpj:cornichon:seed', online: true, lastSeen: Date.now() },
        gherkin: { did: 'qpj:gherkin:seed', online: true, lastSeen: Date.now() },
      },
      meshStatus: 'online',
    });

    render(<MeshK4 />);
    const onlineNodes = document.querySelectorAll('.mesh__node.is-online');
    expect(onlineNodes.length).toBe(4);
  });
});
