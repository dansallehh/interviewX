export type ChildNodeInput = Node | string | number | false | null | undefined;

export interface ElementProps {
  className?: string;
  id?: string;
  type?: string;
  href?: string;
  target?: string;
  rel?: string;
  role?: string;
  tabIndex?: number;
  disabled?: boolean;
  value?: string;
  htmlFor?: string;
  title?: string;
  ariaLabel?: string;
  ariaCurrent?: string;
  ariaSelected?: string;
  ariaExpanded?: string;
  ariaLive?: 'polite' | 'assertive' | 'off';
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  dataset?: Record<string, string>;
  onClick?: (event: MouseEvent) => void;
  onChange?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps | null = null,
  ...children: ChildNodeInput[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (props) {
    if (props.className) el.className = props.className;
    if (props.id) el.id = props.id;
    if (props.type) el.setAttribute('type', props.type);
    if (props.href) el.setAttribute('href', props.href);
    if (props.target) el.setAttribute('target', props.target);
    if (props.rel) el.setAttribute('rel', props.rel);
    if (props.role) el.setAttribute('role', props.role);
    if (typeof props.tabIndex === 'number') el.tabIndex = props.tabIndex;
    if (props.disabled) el.setAttribute('disabled', '');
    if (props.value !== undefined) (el as HTMLInputElement).value = props.value;
    if (props.htmlFor) el.setAttribute('for', props.htmlFor);
    if (props.title) el.title = props.title;
    if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);
    if (props.ariaCurrent) el.setAttribute('aria-current', props.ariaCurrent);
    if (props.ariaSelected) el.setAttribute('aria-selected', props.ariaSelected);
    if (props.ariaExpanded) el.setAttribute('aria-expanded', props.ariaExpanded);
    if (props.ariaLive) el.setAttribute('aria-live', props.ariaLive);
    if (props.ariaDescribedBy) el.setAttribute('aria-describedby', props.ariaDescribedBy);
    if (props.ariaLabelledBy) el.setAttribute('aria-labelledby', props.ariaLabelledBy);
    if (props.dataset) {
      for (const [k, v] of Object.entries(props.dataset)) {
        el.dataset[k] = v;
      }
    }
    if (props.onClick) el.addEventListener('click', props.onClick as EventListener);
    if (props.onChange) el.addEventListener('change', props.onChange);
    if (props.onKeyDown) el.addEventListener('keydown', props.onKeyDown as EventListener);
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else {
      el.appendChild(child);
    }
  }

  return el;
}

export function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
  ...children: SVGElement[]
): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  for (const child of children) {
    el.appendChild(child);
  }
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}
