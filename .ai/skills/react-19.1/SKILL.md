---
name: react-19.1
description: |
  React 19.1 patterns for functional components, hooks, and new APIs.
  TRIGGER when: creating or editing React components (.tsx), using hooks,
  or managing component state and refs.
metadata:
  version: '19.1.0'
  catalog_ref: 'react: 19.1.0'
  scope: [client]
  auto_invoke: 'When writing React components or hooks'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# React 19.1

## Version

react@19.1.0 (from pnpm catalog)

## Critical Patterns

- Functional components only -- no class components
- Use `use()` hook for reading resources (promises, context) during render
- Pass `ref` as a regular prop -- `forwardRef` is no longer needed
- Ref callbacks support cleanup functions (return a function from the callback)
- Use React Server Components where applicable (expo-router supports them)
- Use `useActionState` for form state management with server actions
- Use `useOptimistic` for optimistic UI updates
- Use `useTransition` for non-blocking state updates
- `React.memo` only when profiling proves a re-render bottleneck
- Colocate state as close to where it is used as possible

## Must NOT Do

- NEVER use class components -- always use function components
- NEVER use `forwardRef` -- pass ref as a regular prop in React 19
- NEVER use `useEffect` for data fetching -- use `use()` with Suspense or a data library
- NEVER use `useEffect` to sync state derived from props -- compute during render
- NEVER call hooks conditionally or inside loops
- NEVER mutate state directly -- always use setter functions
- NEVER use `React.FC` type -- type props directly on the function parameter
- NEVER use `defaultProps` -- use JavaScript default parameters
- NEVER use string refs or findDOMNode

## Examples

### Component with ref as prop (React 19)

```tsx
interface InputProps {
  label: string;
  ref?: React.Ref<HTMLInputElement>;
}

function Input({ label, ref }: InputProps) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}
```

### use() hook for promises

```tsx
import { use, Suspense } from 'react';

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <Text>{user.name}</Text>;
}

// Parent wraps with Suspense
<Suspense fallback={<Loading />}>
  <UserProfile userPromise={fetchUser(id)} />
</Suspense>;
```

### use() hook for context

```tsx
import { use } from 'react';
import { ThemeContext } from './theme';

function ThemedButton() {
  const theme = use(ThemeContext);
  return <Button style={{ color: theme.primary }} />;
}
```

### useActionState for forms

```tsx
import { useActionState } from 'react';

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
  });

  return (
    <form action={formAction}>
      <input name="email" type="email" />
      {state.error && <Text>{state.error}</Text>}
      <button type="submit" disabled={isPending}>
        Log In
      </button>
    </form>
  );
}
```

### useOptimistic for instant feedback

```tsx
import { useOptimistic } from 'react';

function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (current, newTodo: Todo) => [...current, newTodo],
  );
  // ...
}
```

### Ref cleanup function

```tsx
function MeasuredBox() {
  return (
    <div
      ref={(node) => {
        if (node) {
          const observer = new ResizeObserver(() => {
            /* ... */
          });
          observer.observe(node);
          return () => observer.disconnect(); // cleanup
        }
      }}
    />
  );
}
```

### Correct prop typing (no React.FC)

```tsx
// BAD
const Card: React.FC<CardProps> = ({ title, children }) => { ... };

// GOOD
function Card({ title, children }: CardProps) {
  return <View><Text>{title}</Text>{children}</View>;
}
```
