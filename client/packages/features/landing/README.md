# @features/landing

Landing and legal pages for the Financial Management application. Provides the marketing homepage, privacy policy, terms of service, contact form, and a 404 not-found page. All pages are presentation-only with no domain logic.

## Pages

| Page           | Route         | Description                                                            |
| -------------- | ------------- | ---------------------------------------------------------------------- |
| `LandingPage`  | `/landing`    | Marketing homepage with hero, features, how-it-works, and CTA sections |
| `PrivacyPage`  | `/privacy`    | Privacy policy                                                         |
| `TermsPage`    | `/terms`      | Terms of service                                                       |
| `ContactPage`  | `/contact`    | Contact form                                                           |
| `NotFoundPage` | `/+not-found` | 404 fallback page                                                      |

## Presentation components

### Templates

| Template           | Description                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| `LandingTemplate`  | Composes all landing page sections (Header, Hero, Features, HowItWorks, CTA, Footer) |
| `PrivacyTemplate`  | Privacy policy content layout                                                        |
| `TermsTemplate`    | Terms of service content layout                                                      |
| `ContactTemplate`  | Contact form layout                                                                  |
| `NotFoundTemplate` | 404 page layout                                                                      |

### Organisms

| Organism            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `LandingHeader`     | Top navigation with logo and login button        |
| `HeroSection`       | Hero banner with headline and get-started CTA    |
| `FeaturesSection`   | Feature highlights grid                          |
| `HowItWorksSection` | Step-by-step explanation                         |
| `CTASection`        | Call-to-action banner                            |
| `LandingFooter`     | Footer with links to privacy, terms, and contact |

### Molecules

| Molecule          | Description                                    |
| ----------------- | ---------------------------------------------- |
| `FeatureCard`     | Single feature highlight card                  |
| `LegalPageHeader` | Shared header for legal pages (privacy, terms) |
| `LegalSection`    | Reusable legal content section block           |

## Architecture

This package is presentation-only. There is no domain or application layer.

```
src/
  index.ts                          Public exports
  presentation/
    pages/                          5 page components
      landing/                      LandingPage
      privacy/                      PrivacyPage
      terms/                        TermsPage
      contact/                      ContactPage
      not-found/                    NotFoundPage
    components/
      templates/                    5 template components
      organisms/                    6 organism components (header, hero, features, etc.)
      molecules/                    3 molecule components (feature-card, legal-page-header, legal-section)
```

## Navigation

The landing page template accepts callback props for navigation:

- `onLoginPress` -- Navigate to the auth login screen
- `onGetStartedPress` -- Navigate to the auth registration screen
- `onPrivacyPress` -- Navigate to the privacy policy page
- `onTermsPress` -- Navigate to the terms of service page
- `onContactPress` -- Navigate to the contact page

## Dependencies

### Internal

`@features/ui`, `@packages/i18n`, `@packages/utils`

### External

@expo/vector-icons

## Scripts

| Script      | Command          | Description                 |
| ----------- | ---------------- | --------------------------- |
| `typecheck` | `tsc --noEmit`   | Type-check without emitting |
| `lint`      | `eslint .`       | Run ESLint                  |
| `lint:fix`  | `eslint . --fix` | Auto-fix lint errors        |
| `test`      | `jest`           | Run unit tests              |

## Testing

```bash
pnpm test
```

Every page, template, organism, and molecule has a co-located test file. Mocks for Expo modules and react-native are in `src/__mocks__/`.
