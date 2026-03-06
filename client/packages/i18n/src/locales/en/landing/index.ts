export const landing = {
  header: {
    logo: 'Financial Management',
    nav: {
      features: 'Features',
      howItWorks: 'How it works',
    },
    cta: 'Sign in',
    a11y: {
      nav: 'Main navigation',
      navFeatures: 'View features',
      navHowItWorks: 'View how it works',
      cta: 'Go to sign in screen',
    },
  },
  hero: {
    badge: 'Personal financial management',
    headline: 'Control your money,',
    headlineAccent: 'build your future',
    subtitle:
      'Connect your accounts, analyze your expenses, and make smart decisions with real-time financial data.',
    cta: {
      getStarted: 'Get started free →',
      features: 'See features',
    },
    stats: {
      users: { value: '10K+', label: 'Active users' },
      rating: { value: '4.9★', label: 'Rating' },
      uptime: { value: '99.9%', label: 'Uptime' },
    },
    a11y: {
      getStarted: 'Get started free, go to registration',
      features: 'View app features',
    },
  },
  features: {
    sectionLabel: 'Features',
    title: 'Everything in one place',
    subtitle:
      'Tools designed to simplify your financial life and help you reach your goals.',
    items: {
      expenses: {
        title: 'Expense tracking',
        description:
          'Record and categorize your expenses automatically. Know exactly what you are spending each month.',
      },
      analytics: {
        title: 'Visual analytics',
        description:
          'Clear, interactive charts showing trends, patterns, and savings opportunities in your money.',
      },
      multiCurrency: {
        title: 'Multi-currency',
        description:
          'Manage accounts in different currencies with real-time conversion. Ideal for international expenses.',
      },
      security: {
        title: 'Bank-grade security',
        description:
          'Bank-level encryption (AES-256) and two-factor authentication to keep your information safe.',
      },
    },
  },
  howItWorks: {
    sectionLabel: 'How it works',
    title: 'Start in minutes',
    subtitle: 'No complications. No technical setup. No upfront costs.',
    steps: {
      create: {
        title: 'Create your account',
        description:
          'Sign up in under 2 minutes. All you need is your email and password. Completely free.',
      },
      connect: {
        title: 'Connect your accounts',
        description:
          'Securely link your bank accounts and cards. Data syncs automatically.',
      },
      analyze: {
        title: 'Analyze and grow',
        description:
          'Visualize your finances in real time, discover patterns, and receive personalized recommendations.',
      },
    },
    a11y: {
      step: 'Step {{number}}: {{title}}. {{description}}',
    },
  },
  cta: {
    title: 'Ready to take control?',
    subtitle:
      'Join over 10,000 people who already manage their finances intelligently. Free forever on the basic plan.',
    button: 'Start for free now',
    trustNote: 'No credit card required · Cancel anytime',
    a11y: {
      button: 'Get started free, go to account registration',
    },
  },
  footer: {
    logo: 'Financial Management',
    links: {
      privacy: { label: 'Privacy', a11y: 'Privacy policy' },
      terms: { label: 'Terms', a11y: 'Terms and conditions' },
      contact: { label: 'Contact', a11y: 'Contact support' },
    },
    copyright: '© {{year}} Financial Management. All rights reserved.',
    tagline: 'Made with ♥ for personal finance management',
  },
} as const;

export type LandingTranslation = typeof landing;
