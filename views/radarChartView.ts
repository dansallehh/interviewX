import type { TopicScore } from '../models/report';
import { svgEl } from './dom';

export function renderRadarChart(topicScores: readonly TopicScore[], passMark: number): SVGElement {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 112;
  const count = Math.max(3, topicScores.length);

  const pointAt = (index: number, pct: number): [number, number] => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, pct)) / 100) * maxRadius;
    return [
      Math.round((cx + Math.cos(angle) * r) * 10) / 10,
      Math.round((cy + Math.sin(angle) * r) * 10) / 10,
    ];
  };

  const toPointsAttr = (pts: [number, number][]): string =>
    pts.map(([x, y]) => `${x},${y}`).join(' ');

  const children: SVGElement[] = [];

  const titleEl = svgEl('title', {});
  titleEl.textContent = 'Competency Radar Chart';
  const descEl = svgEl('desc', {});
  descEl.textContent = topicScores.map((t) => `${t.topic}: ${t.percentage}%`).join(', ');
  children.push(titleEl, descEl);

  // Concentric reference polygons (25%, 50%, 75%, 100%)
  for (const ring of [25, 50, 75, 100]) {
    const ringPts = topicScores.map((_, i) => pointAt(i, ring));
    children.push(svgEl('polygon', { class: 'radar-grid-ring', points: toPointsAttr(ringPts) }));
  }

  // Axis lines
  for (let i = 0; i < topicScores.length; i += 1) {
    const [x, y] = pointAt(i, 100);
    children.push(svgEl('line', { class: 'radar-axis', x1: cx, y1: cy, x2: x, y2: y }));
  }

  // Pass-mark reference polygon
  const passPts = topicScores.map((_, i) => pointAt(i, passMark));
  children.push(svgEl('polygon', { class: 'radar-pass-poly', points: toPointsAttr(passPts) }));

  // Candidate score polygon
  const scorePts = topicScores.map((t, i) => pointAt(i, t.percentage));
  children.push(svgEl('polygon', { class: 'radar-score-poly', points: toPointsAttr(scorePts) }));

  // Score dots + axis labels
  topicScores.forEach((t, i) => {
    const [dx, dy] = scorePts[i];
    children.push(svgEl('circle', { class: 'radar-dot', cx: dx, cy: dy, r: 4 }));

    const [lx, ly] = pointAt(i, 122);
    const anchor = Math.abs(lx - cx) < 12 ? 'middle' : lx > cx ? 'start' : 'end';
    const labelText = svgEl('text', {
      class: 'radar-label',
      x: lx,
      y: ly,
      'text-anchor': anchor,
      'dominant-baseline': 'middle',
    });
    const shortTopic = t.topic.length > 18 ? `${t.topic.slice(0, 17)}…` : t.topic;
    labelText.textContent = `${shortTopic} (${t.percentage}%)`;
    children.push(labelText);
  });

  return svgEl(
    'svg',
    {
      class: 'radar-svg',
      viewBox: `0 0 ${size} ${size}`,
      role: 'img',
      'aria-label': `Competency radar chart: ${descEl.textContent}`,
    },
    ...children,
  );
}
