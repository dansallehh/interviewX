import type { RoleId } from '../models/role';
import { svgEl } from './dom';

/**
 * Crisp 2D SVG geometric motifs per role.
 * Serves both as role-card emblems and as the automatic 2D fallback when WebGL is unavailable.
 */
export function renderRoleMotifSvg(roleId: RoleId, size = 24): SVGElement {
  const baseAttrs = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.6',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };

  switch (roleId) {
    case 'fresh':
      return svgEl(
        'svg',
        baseAttrs,
        svgEl('polygon', { points: '12 3 21 8 12 13 3 8 12 3' }),
        svgEl('polyline', { points: '3 13 12 18 21 13' }),
        svgEl('polyline', { points: '3 17.5 12 22 21 17.5' }),
      );
    case 'senior':
      return svgEl(
        'svg',
        baseAttrs,
        svgEl('circle', { cx: 12, cy: 12, r: 3 }),
        svgEl('ellipse', { cx: 12, cy: 12, rx: 9.5, ry: 4, transform: 'rotate(30 12 12)' }),
        svgEl('ellipse', { cx: 12, cy: 12, rx: 9.5, ry: 4, transform: 'rotate(-30 12 12)' }),
      );
    case 'pm':
      return svgEl(
        'svg',
        baseAttrs,
        svgEl('line', { x1: 3, y1: 6, x2: 14, y2: 6 }),
        svgEl('line', { x1: 7, y1: 12, x2: 20, y2: 12 }),
        svgEl('line', { x1: 4, y1: 18, x2: 16, y2: 18 }),
        svgEl('circle', { cx: 14, cy: 6, r: 1.5, fill: 'currentColor' }),
        svgEl('circle', { cx: 20, cy: 12, r: 1.5, fill: 'currentColor' }),
        svgEl('circle', { cx: 16, cy: 18, r: 1.5, fill: 'currentColor' }),
      );
    case 'dev':
      return svgEl(
        'svg',
        baseAttrs,
        svgEl('polyline', { points: '8 7 3 12 8 17' }),
        svgEl('polyline', { points: '16 7 21 12 16 17' }),
        svgEl('line', { x1: 14, y1: 5, x2: 10, y2: 19 }),
      );
    case 'sa':
      return svgEl(
        'svg',
        baseAttrs,
        svgEl('rect', { x: 3, y: 3, width: 6, height: 6, rx: 1 }),
        svgEl('rect', { x: 15, y: 3, width: 6, height: 6, rx: 1 }),
        svgEl('rect', { x: 9, y: 15, width: 6, height: 6, rx: 1 }),
        svgEl('path', { d: 'M9 6h6M12 6v9' }),
      );
    case 'qa':
      return svgEl(
        'svg',
        baseAttrs,
        svgEl('path', { d: 'M12 3l8 3.5v5.5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6.5L12 3z' }),
        svgEl('polyline', { points: '8.5 12.2 11 14.7 16 9.5' }),
      );
    case 'dba':
      return svgEl(
        'svg',
        baseAttrs,
        svgEl('ellipse', { cx: 12, cy: 6, rx: 7.5, ry: 3 }),
        svgEl('path', { d: 'M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6' }),
        svgEl('path', { d: 'M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3' }),
      );
  }
}
