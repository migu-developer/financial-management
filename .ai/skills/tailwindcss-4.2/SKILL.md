---
name: tailwindcss-4.2
description: |
  Tailwind CSS 4.2 with CSS-first configuration and @theme directive.
  TRIGGER when: configuring Tailwind, editing global CSS, defining design tokens,
  or using @tailwindcss/postcss plugin.
metadata:
  version: '4.2.2'
  catalog_ref: 'tailwindcss: ^4.2.2'
  scope: [client]
  auto_invoke: 'When configuring Tailwind CSS or defining design tokens'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# Tailwind CSS 4.2

## Version

tailwindcss@4.2.2 (from pnpm catalog), @tailwindcss/postcss@4.2.2

## Critical Patterns

- CSS-first configuration: all customization goes in your CSS file, not JS
- No `tailwind.config.js` needed in v4 -- use `@theme` directive in CSS
- Use `@theme` to define design tokens that generate utility classes
- Use CSS custom properties in `:root` for values that do NOT need utility classes
- PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss` directly)
- All theme variables are automatically exposed as CSS custom properties
- Use `@import "tailwindcss"` to load the framework (replaces `@tailwind base/components/utilities`)
- Use `@theme inline` to prevent generating CSS variables for internal tokens
- Colors, spacing, fonts, breakpoints are all defined inside `@theme {}`
- The `@source` directive tells Tailwind where to scan for class names

## Must NOT Do

- NEVER create `tailwind.config.js` or `tailwind.config.ts` -- v4 uses CSS-first config
- NEVER use `@tailwind base`, `@tailwind components`, `@tailwind utilities` -- use `@import "tailwindcss"`
- NEVER use `@apply` excessively -- prefer utility classes directly in markup
- NEVER define design tokens in `:root` if they should generate utilities (use `@theme`)
- NEVER use the old `tailwindcss` PostCSS plugin name -- use `@tailwindcss/postcss`
- NEVER use `rem` values in `@theme` for NativeWind (RN does not support rem)

## Examples

### Global CSS entry point

```css
@import 'tailwindcss';

@source "../components/**/*.tsx";
@source "../app/**/*.tsx";

@theme {
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-900: #0c4a6e;

  --color-surface-light: #ffffff;
  --color-surface-dark: #0f172a;

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
}
```

### PostCSS configuration

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### Using theme tokens as utilities

```tsx
// These utility classes are auto-generated from @theme variables:
<View className="bg-primary-500 text-white font-sans" />
<Text className="text-primary-700 dark:text-primary-100" />
```

### @theme inline for internal tokens

```css
@theme inline {
  --spacing-header: 64px;
  --spacing-sidebar: 240px;
}
/* These become CSS vars but do NOT generate utility classes */
```

### Extending with custom utilities via CSS

```css
@utility scrollbar-hidden {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### Source scanning configuration

```css
/* Tell Tailwind where your components live */
@source "../client/packages/features/**/*.tsx";
@source "../client/main/app/**/*.tsx";
```
