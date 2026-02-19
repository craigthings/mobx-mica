# Mantle-Web Styling Patterns

This document covers the recommended styling patterns for Mantle-Web components.

---

## Overview

Mantle-Web uses [Goober](https://goober.js.org/) internally for CSS-in-JS. This gives you:

- SCSS-like nested selectors (`&:hover`, `.child`)
- Unique class generation (automatic scoping)
- SSR support via `extractCss()`
- ~1KB runtime
- **Zero setup** — just import and use

```tsx
import { css } from 'mantle-web';

const className = css`
  background: blue;
  &:hover { background: darkblue; }
`;
```

### No Configuration Required

Mantle handles Goober's initialization internally. You never need to call `setup()` or configure anything — just import `css`, `styled`, or `keyframes` and start using them.

---

## Quick Reference: `css` vs `styled`

### `css` — Returns a Class String

```tsx
import { css } from 'mantle-web';

const buttonClass = css`
  background: blue;
  padding: 8px 16px;
`;

// Use in JSX
<button class={buttonClass}>Click me</button>
```

### `styled` — Returns a Component

```tsx
import { styled } from 'mantle-web';

const Button = styled('button')`
  background: blue;
  padding: 8px 16px;
  
  &:hover {
    background: darkblue;
  }
`;

// Use directly as JSX element
<Button>Click me</Button>
<Button onClick={handleClick}>Submit</Button>
```

### `styled` with Dynamic Props

```tsx
import { styled } from 'mantle-web';

const Button = styled('button')`
  background: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;
  padding: ${props => props.compact ? '4px 8px' : '8px 16px'};
  
  &:hover {
    filter: brightness(1.1);
  }
`;

// Pass props
<Button primary>Primary</Button>
<Button compact>Small</Button>
<Button primary compact>Both</Button>
```

### When to Use Each

| API | Returns | Best For |
|-----|---------|----------|
| `css` | Class string | Use with Component patterns, `get styles()`, external files |
| `styled` | Component | Standalone styled elements, quick prototyping |

---

## Pattern 1: Inline `get styles()` Getter

Best for simple components where styles live with the logic. Target elements explicitly with class selectors — same mental model as CSS, Svelte, and Vue.

### Basic Example

```tsx
import { Component, createComponent, css } from 'mantle-web';

class Button extends Component<{ primary?: boolean }> {
  loading = false;
  
  get styles() {
    return css`
      .btn {
        background: ${this.props.primary ? '#007bff' : '#6c757d'};
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        opacity: ${this.loading ? 0.5 : 1};
        cursor: ${this.loading ? 'wait' : 'pointer'};
      }
      
      .btn:hover {
        filter: brightness(1.1);
      }
      
      .btn:disabled {
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
    // Scoping class auto-applied to root element
    return (
      <button class="btn" onClick={this.handleClick} disabled={this.loading}>
        {this.props.children}
      </button>
    );
  }
}

export default createComponent(Button);
```

### Multi-Element Example

```tsx
class Card extends Component<Props> {
  get styles() {
    return css`
      .card {
        background: white;
        border-radius: 8px;
      }
      
      .header {
        padding: 16px;
        font-weight: bold;
      }
      
      .body {
        padding: 16px;
      }
    `;
  }
  
  render() {
    // Scoping class auto-applied to root, selectors target children
    return (
      <div class="card">
        <div class="header">Title</div>
        <div class="body">Content</div>
      </div>
    );
  }
}
```

### Reactive Styles with State

Styles automatically update when any observable state changes:

```tsx
import { Component, createComponent, css } from 'mantle-web';

class ColorPicker extends Component {
  // Observable state
  hue = 180;
  saturation = 70;
  lightness = 50;
  expanded = false;
  
  get styles() {
    // MobX tracks all state access here — styles recompute when any change
    return css`
      .picker {
        background: hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%);
        padding: ${this.expanded ? '24px' : '12px'};
        border-radius: ${this.expanded ? '16px' : '8px'};
        transition: all 0.3s ease;
      }
      
      .preview {
        width: ${this.expanded ? '200px' : '100px'};
        height: ${this.expanded ? '200px' : '100px'};
        border-radius: 50%;
        background: hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%);
        box-shadow: ${this.expanded 
          ? `0 8px 32px hsla(${this.hue}, ${this.saturation}%, 30%, 0.4)`
          : 'none'
        };
      }
      
      .sliders {
        opacity: ${this.expanded ? 1 : 0};
        max-height: ${this.expanded ? '200px' : '0'};
        overflow: hidden;
        transition: all 0.3s ease;
      }
    `;
  }
  
  render() {
    // Scoping class auto-applied to root element
    return (
      <div class="picker" onClick={() => this.expanded = !this.expanded}>
        <div class="preview" />
        <div class="sliders">
          <input 
            type="range" 
            min="0" max="360" 
            value={this.hue}
            onInput={e => this.hue = e.target.value} 
          />
          <input 
            type="range" 
            min="0" max="100" 
            value={this.saturation}
            onInput={e => this.saturation = e.target.value} 
          />
          <input 
            type="range" 
            min="0" max="100" 
            value={this.lightness}
            onInput={e => this.lightness = e.target.value} 
          />
        </div>
      </div>
    );
  }
}

export default createComponent(ColorPicker);
```

When `this.hue`, `this.saturation`, `this.lightness`, or `this.expanded` change:
1. MobX detects the change
2. Component re-renders  
3. `get styles()` recomputes with new values
4. Goober generates updated CSS
5. DOM updates via morphdom

### Same Example with External File

You can move the styles to a separate file — same reactivity, better separation:

```tsx
// ColorPicker.styles.ts
import { css } from 'mantle-web';
import type { ColorPicker } from './ColorPicker';

export default (self: ColorPicker) => css`
  .picker {
    background: hsl(${self.hue}, ${self.saturation}%, ${self.lightness}%);
    padding: ${self.expanded ? '24px' : '12px'};
    border-radius: ${self.expanded ? '16px' : '8px'};
    transition: all 0.3s ease;
  }
  
  .preview {
    width: ${self.expanded ? '200px' : '100px'};
    height: ${self.expanded ? '200px' : '100px'};
    border-radius: 50%;
    background: hsl(${self.hue}, ${self.saturation}%, ${self.lightness}%);
    box-shadow: ${self.expanded 
      ? `0 8px 32px hsla(${self.hue}, ${self.saturation}%, 30%, 0.4)`
      : 'none'
    };
  }
  
  .sliders {
    opacity: ${self.expanded ? 1 : 0};
    max-height: ${self.expanded ? '200px' : '0'};
    overflow: hidden;
  }
`;
```

```tsx
// ColorPicker.tsx
import { Component, createComponent } from 'mantle-web';
import styles from './ColorPicker.styles';

export class ColorPicker extends Component {
  hue = 180;
  saturation = 70;
  lightness = 50;
  expanded = false;
  
  // Connect external styles to this component
  static styles = styles;
  
  render() {
    // Scoping class auto-applied to root
    return (
      <div class="picker" onClick={() => this.expanded = !this.expanded}>
        <div class="preview" />
        <div class="sliders">
          {/* sliders... */}
        </div>
      </div>
    );
  }
}

export default createComponent(ColorPicker);
```

Same reactive behavior, cleaner component file. Use `self` (or `$`, or whatever you prefer) in the style file to access all component state and props.

### How It Works

1. Define a `get styles()` getter that returns `css\`...\``
2. MobX makes it a computed — cached until observables change
3. Goober generates a unique scoping class (e.g., `go3x7k`)
4. `createComponent` auto-applies the scoping class to the root element
5. Target all elements (including root) with explicit selectors — like Vue/Svelte

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
  .card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  
  .card.highlighted {
    box-shadow: 0 0 0 2px #007bff;
  }
  
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
  
  .card:hover .actions {
    opacity: 1;
  }
`;
```

### The Component File

```tsx
// Card.tsx
import { Component, createComponent } from 'mantle-web';
import styles from './Card.styles';

export class Card extends Component<{ 
  title: string;
  highlighted?: boolean;
}> {
  static styles = styles;
  
  render() {
    // Scoping class auto-applied to root element
    return (
      <div class={`card ${this.props.highlighted ? 'highlighted' : ''}`}>
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

### How It Works

1. Style file exports a function: `($: Component) => css\`...\``
2. Function receives component instance — access `$.props`, `$.state`, etc.
3. Goober generates a unique scoping class (e.g., `go3x7k`)
4. All selectors (`.card`, `.header`, `.body`) are scoped under that class

### Generated CSS

```css
.go3x7k .card {
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

All selectors scoped — no collisions with other components.

### When to Use

- Large components with many styled elements
- Team prefers styles separate from logic
- Designer/developer collaboration
- Styles that might be shared or themed

---

## Comparison

| Pattern | Location | Best For |
|---------|----------|----------|
| `get styles()` | Inline in component | Simple components, tight coupling |
| External file | Separate `.styles.ts` | Complex components, team separation |
| `styled()` components | Inline or file | Standalone elements, quick prototyping |

All patterns use explicit class targeting — no magic auto-apply.

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

### Goober Setup (Internal)

Mantle initializes Goober automatically — users never see this:

```tsx
// mantle-web/styling.ts (internal)
import { setup, css, styled as gooberStyled, keyframes, extractCss } from 'goober';
import { h } from './h';

// Auto-setup when module loads
setup(h);

// Re-export for users
export { css, keyframes, extractCss };
export const styled = gooberStyled;
```

### How Scoping Works

Goober's `css` returns a generated class name. All selectors in the template are scoped under that class:

```tsx
const scopeClass = css`
  .card { background: white; }
  .header { font-weight: bold; }
`;
// scopeClass = "go3x7k"

// Generated CSS:
// .go3x7k .card { background: white; }
// .go3x7k .header { font-weight: bold; }
```

### Auto-Apply to Root Element

When you define `get styles()` or `static styles`, `createComponent` automatically merges the scoping class with the root element's existing classes:

```tsx
get styles() {
  return css`
    .card { background: white; }
    .header { font-weight: bold; }
  `;
}

render() {
  // Root element gets scoping class auto-applied
  // <div class="card"> becomes <div class="go3x7k card">
  return (
    <div class="card">
      <div class="header">...</div>
    </div>
  );
}
```

### Implementation (~15 lines)

```tsx
// In createComponent
const originalRender = instance.render.bind(instance);
const staticStylesFn = ComponentClass.styles;

instance.render = () => {
  const result = originalRender();
  let scopeClass = '';
  
  // Get scoping class from getter or static styles
  if ('styles' in instance) {
    scopeClass = (instance as any).styles;
  } else if (staticStylesFn) {
    scopeClass = staticStylesFn(instance);
  }
  
  // Merge with root element's existing class
  if (scopeClass) {
    result.props.class = result.props.class 
      ? `${scopeClass} ${result.props.class}`
      : scopeClass;
  }
  
  return result;
};
```

### The Mental Model

Same as Vue/Svelte scoped styles:
1. Framework auto-applies scoping to root element
2. You target all elements with explicit selectors (`.card`, `.header`, etc.)
3. No extra wrapper divs needed

---

## Summary

1. **Simple components:** Use `get styles()` inline
2. **Complex components:** Use external `.styles.ts` file with `static styles`
3. **Standalone elements:** Use `styled()` components
4. **Auto-apply:** Scoping class automatically applied to root element
5. **Explicit selectors:** Target all elements via class selectors (like Vue/Svelte)
6. **Goober handles:** Nesting, scoping, SSR, caching
7. **MobX handles:** Reactive updates when observables change

Same mental model as Vue/Svelte scoped styles — auto-scoping + explicit selectors.

The styling system is ~15 lines of framework code + Goober.
