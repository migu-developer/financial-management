export const landing = {
  header: {
    logo: 'Gestión Financiera',
    nav: {
      features: 'Características',
      howItWorks: 'Cómo funciona',
    },
    cta: 'Acceder',
    a11y: {
      nav: 'Navegación principal',
      navFeatures: 'Ver características',
      navHowItWorks: 'Ver cómo funciona',
      cta: 'Ir a la pantalla de inicio de sesión',
    },
  },
  hero: {
    badge: 'Gestión financiera personal',
    headline: 'Controla tu dinero,',
    headlineAccent: 'construye tu futuro',
    subtitle:
      'Conecta tus cuentas, analiza tus gastos y toma decisiones inteligentes con datos financieros en tiempo real.',
    cta: {
      getStarted: 'Comenzar gratis →',
      features: 'Ver características',
    },
    stats: {
      users: { value: '10K+', label: 'Usuarios activos' },
      rating: { value: '4.9★', label: 'Calificación' },
      uptime: { value: '99.9%', label: 'Disponibilidad' },
    },
    a11y: {
      getStarted: 'Comenzar gratis, ir al registro',
      features: 'Ver características de la aplicación',
    },
  },
  features: {
    sectionLabel: 'Características',
    title: 'Todo en un solo lugar',
    subtitle:
      'Herramientas diseñadas para simplificar tu vida financiera y ayudarte a alcanzar tus metas.',
    items: {
      expenses: {
        title: 'Control de gastos',
        description:
          'Registra y categoriza tus gastos automáticamente. Sabe exactamente en qué y cuánto estás gastando cada mes.',
      },
      analytics: {
        title: 'Análisis visual',
        description:
          'Gráficas claras e interactivas que muestran tendencias, patrones y oportunidades de ahorro en tu dinero.',
      },
      multiCurrency: {
        title: 'Multi-moneda',
        description:
          'Administra cuentas en diferentes monedas con conversión en tiempo real. Ideal para gastos internacionales.',
      },
      security: {
        title: 'Seguridad de alto nivel',
        description:
          'Autenticación de dos factores para mantener tu información segura.',
      },
    },
  },
  howItWorks: {
    sectionLabel: '¿Cómo funciona?',
    title: 'Empieza en minutos',
    subtitle:
      'Sin complicaciones. Sin configuración técnica. Sin costos iniciales.',
    steps: {
      create: {
        title: 'Crea tu cuenta',
        description:
          'Regístrate en menos de 2 minutos. Solo necesitas tu correo y contraseña. Es completamente gratis.',
      },
      connect: {
        title: 'Conecta tus cuentas',
        description:
          'Vincula tus cuentas bancarias y tarjetas de forma segura. Los datos se sincronizan automáticamente.',
      },
      analyze: {
        title: 'Analiza y crece',
        description:
          'Visualiza tus finanzas en tiempo real, descubre patrones y recibe recomendaciones personalizadas.',
      },
    },
    a11y: {
      step: 'Paso {{number}}: {{title}}. {{description}}',
    },
  },
  cta: {
    title: '¿Listo para tomar el control?',
    subtitle:
      'Unete a nosotros y toma el control de tus finanzas. Gratis para siempre en el plan básico.',
    button: 'Comenzar gratis ahora',
    trustNote: 'Sin tarjeta de crédito requerida · Cancela cuando quieras',
    a11y: {
      button: 'Comenzar gratis, ir al registro de cuenta',
    },
  },
  footer: {
    logo: 'Gestión Financiera',
    links: {
      privacy: { label: 'Privacidad', a11y: 'Política de privacidad' },
      terms: { label: 'Términos', a11y: 'Términos y condiciones' },
      contact: { label: 'Contacto', a11y: 'Contactar soporte' },
    },
    copyright:
      '© {{year}} Financial Management. Todos los derechos reservados.',
    tagline: 'Hecho con ♥ para el control financiero personal',
  },
  privacy: {
    title: 'Política de Privacidad',
    lastUpdated: '7 de marzo de 2026',
    back: 'Volver',
    sections: {
      intro: 'Introducción',
      dataCollection: 'Información que recopilamos',
      dataUse: 'Cómo usamos tu información',
      dataSharing: 'Compartición de datos',
      dataSecurity: 'Seguridad de datos',
      thirdPartyAuth: 'Autenticación de terceros',
      userRights: 'Tus derechos',
      policyChanges: 'Cambios en la política',
      contactInfo: 'Contacto',
    },
  },
  terms: {
    title: 'Términos de Servicio',
    lastUpdated: '7 de marzo de 2026',
    back: 'Volver',
    sections: {
      intro: 'Introducción',
      acceptance: 'Aceptación de los términos',
      serviceDescription: 'Descripción del servicio',
      useOfServices: 'Uso de los servicios',
      userContent: 'Contenido del usuario',
      thirdPartyServices: 'Servicios de terceros',
      liabilityLimitation: 'Limitación de responsabilidad',
      modifications: 'Modificaciones',
      termination: 'Terminación',
      applicableLaw: 'Ley aplicable',
      contactInfo: 'Contacto',
    },
  },
  contact: {
    title: 'Contáctanos',
    subtitle:
      'Nos encantaría saber de ti. Escríbenos con preguntas, comentarios o solicitudes de soporte.',
    back: 'Volver',
    emailLabel: 'Email',
    email: 'gutierrezmayamiguelangel@gmail.com',
    responseTime: 'Generalmente respondemos en 24–48 horas.',
    sections: {
      support: {
        title: 'Soporte técnico',
        body: 'Para problemas técnicos, errores o solicitudes de funciones, escríbenos un correo y te responderemos a la brevedad.',
      },
      privacyInquiries: {
        title: 'Privacidad y datos',
        body: 'Para preguntas sobre cómo manejamos tus datos o para ejercer tus derechos, contacta a nuestro equipo de privacidad.',
      },
      business: {
        title: 'Negocios',
        body: 'Para alianzas, consultas de prensa u oportunidades de negocio, comunícate con nuestro equipo.',
      },
    },
  },
  notFound: {
    code: '404',
    title: 'Página no encontrada',
    description: 'La página que buscas no existe o ha sido movida.',
    cta: 'Ir al inicio',
    a11y: {
      cta: 'Volver a la página de inicio',
    },
  },
} as const;

export type LandingTranslation = typeof landing;
