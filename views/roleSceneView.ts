import type { RoleDefinition } from '../models/role';
import { clear, h } from './dom';
import { renderRoleMotifSvg } from './roleMotifs';

export interface RoleSceneHandle {
  dispose: () => void;
  mode: 'webgl' | '2d-fallback';
}

export function canUseWebGl(): boolean {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2) {
      return false;
    }
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function mountRoleScene(
  container: HTMLElement,
  role: RoleDefinition,
): RoleSceneHandle {
  clear(container);

  const fallbackEl = h(
    'div',
    { className: 'scene-fallback', dataset: { role: role.id, sceneMode: '2d-fallback' } },
    renderRoleMotifSvg(role.id, 48),
    h('span', { className: 'meta-label' }, `${role.motif} · 2D mode`),
  );
  container.appendChild(fallbackEl);

  if (!canUseWebGl()) {
    return {
      mode: '2d-fallback',
      dispose: () => clear(container),
    };
  }

  let disposed = false;
  let rafId = 0;
  let cleanupThree: (() => void) | null = null;

  void (async () => {
    try {
      const THREE = await import('three');
      if (disposed) return;

      const width = Math.max(180, container.clientWidth || 220);
      const height = 140;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
      camera.position.z = 3.8;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height);

      const accent = new THREE.Color(role.accentHex);
      const material = new THREE.MeshBasicMaterial({
        color: accent,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });

      const geometry = createRoleGeometry(THREE, role.id);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      clear(container);
      renderer.domElement.className = 'scene-canvas';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.dataset.sceneMode = 'webgl';
      container.appendChild(renderer.domElement);

      const renderFrame = () => {
        if (disposed) return;
        if (!document.hidden) {
          mesh.rotation.x += 0.006;
          mesh.rotation.y += 0.01;
          renderer.render(scene, camera);
        }
        rafId = window.requestAnimationFrame(renderFrame);
      };

      const onVisibilityChange = () => {
        if (!document.hidden && !disposed) {
          renderer.render(scene, camera);
        }
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      renderFrame();

      cleanupThree = () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.cancelAnimationFrame(rafId);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    } catch {
      // Keep crisp 2D fallback seamlessly if WebGL context creation fails
    }
  })();

  return {
    mode: 'webgl',
    dispose: () => {
      disposed = true;
      cleanupThree?.();
      clear(container);
    },
  };
}

function createRoleGeometry(
  THREE: typeof import('three'),
  roleId: RoleDefinition['id'],
) {
  switch (roleId) {
    case 'fresh':
      return new THREE.OctahedronGeometry(1.15, 0);
    case 'senior':
      return new THREE.TorusKnotGeometry(0.75, 0.22, 48, 8);
    case 'pm':
      return new THREE.ConeGeometry(1.05, 1.8, 6);
    case 'dev':
      return new THREE.BoxGeometry(1.45, 1.45, 1.45, 2, 2, 2);
    case 'sa':
      return new THREE.IcosahedronGeometry(1.15, 0);
    case 'qa':
      return new THREE.DodecahedronGeometry(1.15, 0);
    case 'dba':
      return new THREE.CylinderGeometry(0.95, 0.95, 1.65, 16, 3);
    case 'ba':
      return new THREE.TetrahedronGeometry(1.25, 1);
  }
}
