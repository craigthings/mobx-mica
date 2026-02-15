# Mantle-Web Styling Patterns

This document covers the recommended styling patterns for Mantle-Web components.

---

## Overview

Mantle-Web uses [Goober](https://goober.js.org/) internally for CSS-in-JS. This gives you:

- SCSS-like nested selectors (`&:hover`, `.child`)
- Unique class generation (automatic scoping)
- SSR support via `extractCss()`
- ~1KB runtime

```tsx
import { css } from 'mantle-web';  // Re-exported from Goober

const className = css`
  background: blue;
  &:hover { background: darkblue; }
`;
```

---

## Pattern 1: Inline `get styles()` Getter

Best for simple components where styles live with the logic.

```tsx
import { Component, createComponent, css } from 'mantle-web';

class Button extends Component<{ primary?: boolean }> {
  loading = false;
  
  get styles() {
    return css`
      background: ${this.props.primary ? '#007bff' : '#6c757d'};
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      opacity: ${this.loading ? 0.5 : 1};
      cursor: ${this.loading ? 'wait' : 'pointer'};
      
      &:hover {
        filter: brightness(1.1);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
  }
  
  async handleClick() {
    this.loading = true;
    await this.props.onAction?.();
    this.loading = false;
  }
  
  render() {
    // styles getter auto-applied to root element!
    return (
      <button onClick={this.handleClick} disabled={this.loading}>
        {this.props.children}
      </button>
    );
  }
}

export default createComponent(Button);
```

### How It Works

1. Define a `get styles()` getter that returns `css\`...\``
2. MobX makes it a computed — cached until observables change
3. `createComponent` auto-applies it to the root element
4. No need to write `class={this.styles}`

### When to Use

- Small to medium components
- Styles tightly coupled to component logic
- Quick prototyping

---

## Pattern 2: External Style File

Best for complex components where you want styles separate from logic.

### The Style File

```tsx
// Card.styles.ts
import { css } from 'mantle-web';
import type { Card } from './Card';

export default ($: Card) => css`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  
  ${$.props.highlighted && `
    box-shadow: 0 0 0 2px #007bff;
  `}
  
  .header {
    padding: 16px;
    border-bottom: 1px solid #eee;
    font-weight: 600;
    font-size: 18px;
  }
  
  .body {
    padding: 16px;
    color: #333;
  }
  
  .footer {
    padding: 16px;
    background: #f9f9f9;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  
  .actions {
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover .actions {
    opacity: 1;
  }
`;
```

### Option A: Explicit Binding

Call the style function in render with `this`:

```tsx
// Card.tsx
import { Component, createComponent } from 'mantle-web';
import styles from './Card.styles';

export class Card extends Component<{ 
  title: string;
  highlighted?: boolean;
}> {
  render() {
    return (
      <div class={styles(this)}>
        <div class="header">
          {this.props.title}
          <span class="actions">
            <button>Edit</button>
            <button>Delete</button>
          </span>
        </div>
        <div class="body">
          {this.props.children}
        </div>
        <div class="footer">
          <Button>Cancel</Button>
          <Button primary>Save</Button>
        </div>
      </div>
    );
  }
}

export default createComponent(Card);
```

**Pros:** Explicit, no magic, obvious where styles come from.

### Option B: Auto-Apply via `static styles`

Register the style function and let `createComponent` apply it:

```tsx
// Card.tsx
import { Component, createComponent } from 'mantle-web';
import styles from './Card.styles';

export class Card extends Component<{ 
  title: string;
  highlighted?: boolean;
}> {
  static styles = styles;  // Auto-applied to root
  
  render() {
    // No class={...} needed on root!
    return (
      <div>
        <div class="header">
          {this.props.title}
          <span class="actions">
            <button>Edit</button>
            <button>Delete</button>
          </span>
        </div>
        <div class="body">
          {this.props.children}
        </div>
        <div class="footer">
          <Button>Cancel</Button>
          <Button primary>Save</Button>
        </div>
      </div>
    );
  }
}

export default createComponent(Card);
```

**Pros:** Cleaner render, less boilerplate.

### How Both Work

1. Style file exports a function: `($: Component) => css\`...\``
2. Function receives component instance — access `$.props`, `$.loading`, etc.
3. Goober generates a unique class (e.g., `go3x7k`)
4. Nested selectors (`.header`, `.body`) are scoped by the root class

### Generated CSS

```css
.go3x7k {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.go3x7k .header {
  padding: 16px;
  border-bottom: 1px solid #eee;
}
.go3x7k .body {
  padding: 16px;
}
/* etc. */
```

Child elements with `class="header"` are automatically scoped — no collisions with other components.

### When to Use

- Large components with many styled elements
- Team prefers styles separate from logic
- Designer/developer collaboration
- Styles that might be shared or themed

---

## Comparison

| Pattern | Location | Binding | Best For |
|---------|----------|---------|----------|
| `get styles()` | Inline | Auto | Simple components |
| External + `styles(this)` | Separate file | Explicit | Complex, prefer explicit |
| External + `static styles` | Separate file | Auto | Complex, prefer clean render |

---

## Dynamic Styles

All patterns support dynamic values via MobX observables:

```tsx
// Inline getter
get styles() {
  return css`
    opacity: ${this.loading ? 0.5 : 1};
    transform: ${this.expanded ? 'scale(1.02)' : 'none'};
  `;
}

// External file
export default ($: Component) => css`
  background: ${$.props.variant === 'danger' ? '#dc3545' : '#007bff'};
  width: ${$.width}px;
`;
```

MobX tracks which observables are accessed. When they change, only affected components re-render, and Goober generates new classes only if the CSS actually changed.

---

## Nested Selectors Reference

Goober supports SCSS-like nesting:

```tsx
css`
  /* Pseudo-classes */
  &:hover { }
  &:focus { }
  &:active { }
  &:disabled { }
  
  /* Pseudo-elements */
  &::before { }
  &::after { }
  
  /* Child selectors */
  .child { }
  > .direct-child { }
  
  /* State-based children */
  &:hover .icon { }
  &.active .label { }
  
  /* Media queries */
  @media (max-width: 768px) {
    padding: 8px;
  }
  
  /* Conditional blocks */
  ${condition && `
    background: red;
  `}
`;
```

---

## SSR Support

Goober handles SSR via `extractCss()`:

```tsx
// Server
import { renderToString } from 'mantle-web/ssr';
import { extractCss } from 'mantle-web';

const html = renderToString(App, props);
const css = extractCss();  // Only styles for rendered components

res.send(`
  <!DOCTYPE html>
  <html>
    <head>
      <style id="_goober">${css}</style>
    </head>
    <body>${html}</body>
  </html>
`);
```

On hydration, Goober recognizes existing styles and doesn't duplicate them.

---

## Implementation Details

### Explicit `styles(this)` — No Framework Code Needed

This just works — you call the function, get a class string:

```tsx
// Your code
<div class={styles(this)}>

// styles(this) returns "go3x7k" — a Goober-generated class
```

### Auto-Apply — ~15 Lines in `createComponent`

```tsx
// In createComponent
const originalRender = instance.render.bind(instance);
const staticStylesFn = ComponentClass.styles;

instance.render = () => {
  const result = originalRender();
  let className = result.props.class || '';
  
  // Auto-apply get styles() getter
  if ('styles' in instance) {
    className = clsx(className, (instance as any).styles);
  }
  
  // Auto-apply static styles
  if (staticStylesFn) {
    className = clsx(className, staticStylesFn(instance));
  }
  
  if (className) {
    result.props.class = className;
  }
  
  return result;
};
```

### Priority

If both `get styles()` and `static styles` exist, both are applied (merged).

---

## Summary

1. **Simple components:** Use `get styles()` inline — auto-applied
2. **Complex components:** Use external style file with either:
   - `class={styles(this)}` — explicit, no magic
   - `static styles` — auto-applied, cleaner render
3. **Goober handles:** Nesting, scoping, SSR, caching
4. **MobX handles:** Reactive updates when observables change

Choose explicit or auto-apply based on team preference. Both are first-class patterns.

The styling system is ~20 lines of framework code. Goober does the heavy lifting.
