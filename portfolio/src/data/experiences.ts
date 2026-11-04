import type { Experience } from "@/types";
import { tech } from "./tech";

export const experiences: Experience[] = [
  {
    roleFR: "Concepteur Développeur (alternance)",
    roleEN: "Software Designer & Developer (work-study)",
    org: "CPAM de Côte-d'Or",
    location: "Dijon, France",
    timeframe: "2026 – 2028",
    stack: [tech.symfony, tech.postgresql, tech.podman, tech.python, tech.fastapi],
    pointsFR: [
      "Recueil des besoins auprès des services internes, d'autres CPAM et de partenaires (CARSAT), rédaction du cahier des charges fonctionnel",
      "Développement d'applications web Symfony + PostgreSQL conteneurisées avec Podman, avec des services Python / FastAPI pour les modules externes",
      "Démos client, mise en qualification avec cahier de recette et tests longue durée avec les utilisateurs",
      "Analyse de risques (formulaire QERSI) pour le service sécurité informatique, puis mise en production sur l'hébergement interne",
    ],
    pointsEN: [
      "Gathered requirements from internal departments, other CPAMs and partners (CARSAT), wrote functional specifications",
      "Built web applications with Symfony + PostgreSQL containerised with Podman, plus Python / FastAPI services for external modules",
      "Client demos, qualification phase with acceptance test plans and long-running user testing",
      "Risk analysis (QERSI form) for the IT security team, then production release on internal hosting",
    ],
  },
  {
    roleFR: "Stagiaire DATA / Architecture",
    roleEN: "DATA / Architecture Intern",
    org: "APRR (Eiffage Group)",
    location: "Saint-Apollinaire, France",
    timeframe: "2026",
    stack: [tech.talend, tech.snowflake, tech.powerbi, tech.postgresql, tech.docker],
    pointsFR: [
      "Intégration et transformation de données avec Talend",
      "Modélisation et requêtage sur Snowflake",
      "Administration et upgrade de TIBCO EBX (MDM v6.1 → v6.2)",
      "Création de tableaux de bord Power BI",
    ],
    pointsEN: [
      "Data integration and transformation with Talend",
      "Data modeling and querying on Snowflake",
      "Administration and upgrade of TIBCO EBX (MDM v6.1 → v6.2)",
      "Created Power BI dashboards",
    ],
  },
  {
    roleFR: "Stagiaire Développeur Web",
    roleEN: "Web Developer Intern",
    org: "InnovQube",
    location: "Noisy-le-Grand, France",
    timeframe: "2025",
    stack: [tech.laravel, tech.livewire, tech.filament, tech.vuejs],
    pointsFR: [
      "Stage full remote sur une solution SaaS de guide de voyage",
      "Ajout des traductions dynamiques selon les préférences utilisateurs",
      "Intégration d'un framework UI (Filament) pour les panneaux d'administration",
      "Optimisation globale de l'application (performance et UX)",
    ],
    pointsEN: [
      "Remote internship on a SaaS travel guide solution",
      "Implemented multilingual support based on user preferences",
      "Integrated a UI framework (Filament) for admin panel management",
      "Optimized overall application performance and UX",
    ],
  },
  {
    roleFR: "Stagiaire Développeur Web",
    roleEN: "Web Developer Intern",
    org: "Association O.R.E.",
    location: "Quetigny, France",
    timeframe: "2024",
    stack: [tech.php, tech.mysql, tech.apache, tech.phpmyadmin],
    pointsFR: [
      "Stage en présentiel au sein du FabLab de l'association",
      "Gestion et maintenance d'un Extranet",
      "Ajout de formulaires de gestion des paiements et abonnements",
      "Mise en place d'une page de consultation des règlements du FabLab",
    ],
    pointsEN: [
      "On-site internship within the association's FabLab",
      "Maintenance and management of an Extranet",
      "Added management forms for payments and subscriptions",
      "Implemented a payment overview page for the FabLab",
    ],
  },
  {
    roleFR: "Stagiaire Technicien de maintenance informatique",
    roleEN: "IT Maintenance Intern",
    org: "ITC Neo Impex",
    location: "Dijon, France",
    timeframe: "2020",
    pointsFR: [
      "Stage d'observation en environnement professionnel",
      "Maintenance et gestion d'un parc informatique",
      "Installation et configuration de nouveaux équipements",
    ],
    pointsEN: [
      "Observation internship in a professional IT environment",
      "Maintenance and management of a computer network and devices",
      "Installation and setup of new computer equipment",
    ],
  },
];
