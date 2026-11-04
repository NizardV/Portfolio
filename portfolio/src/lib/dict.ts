import type { AllDict } from "@/types";

/** All UI copy, FR and EN. Single source of truth (no runtime JSON). */
export const DICT: AllDict = {
  fr: {
    nav: {
      about: "À propos",
      projects: "Projets",
      experience: "Expérience",
      education: "Formation",
      contact: "Contact",
    },
    heroTitle: "Nizard Verdenal",
    heroSub:
      "Concepteur Développeur en alternance à la CPAM de Côte-d'Or • Mastère EADL au DIIAGE",
    ctaContact: "Me contacter",
    about:
      "Concepteur Développeur en alternance à la CPAM de Côte-d'Or et étudiant en Mastère EADL au DIIAGE, après un BTS SIO SLAM et un Bachelor CPI. Je m'intéresse aux stacks web modernes (.NET, React/Next) et à la mise en place d'environnements fiables (Docker, CI/CD). J'aime concevoir des applis utiles et propres, documentées et faciles à maintenir.",
    projectsTitle: "Projets",
    projectsPersonalTitle: "Projets personnels",
    experienceTitle: "Expérience",
    educationTitle: "Formation",
    contactTitle: "Contact",
    contactBlurb:
      "Un projet, une question ou simplement envie d'échanger ? Écrivez-moi.",
    form: { name: "Nom", email: "Email", message: "Message", send: "Envoyer" },
    footer: "© 2026 - Nizard Verdenal.",
  },
  en: {
    nav: {
      about: "About",
      projects: "Projects",
      experience: "Experience",
      education: "Education",
      contact: "Contact",
    },
    heroTitle: "Nizard Verdenal",
    heroSub:
      "Software Designer & Developer (work-study) at CPAM de Côte-d'Or • EADL Master's at DIIAGE",
    ctaContact: "Contact me",
    about:
      "Software Designer & Developer in a work-study program at CPAM de Côte-d'Or, and EADL Master's student at DIIAGE (after a BTS SIO SLAM and a Bachelor CPI). Focused on modern web stacks (.NET, React/Next) and reliable environments (Docker, CI/CD). I build useful, clean apps with maintainable docs.",
    projectsTitle: "Projects",
    projectsPersonalTitle: "Personal projects",
    experienceTitle: "Experience",
    educationTitle: "Education",
    contactTitle: "Contact",
    contactBlurb:
      "Got a project, a question, or just want to chat? Drop a line.",
    form: { name: "Name", email: "Email", message: "Message", send: "Send" },
    footer: "© 2026 - Nizard Verdenal.",
  },
} as const;
