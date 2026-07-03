import type React from "react";

export type Lang = "fr" | "en";

export type Dict = {
  nav: { about: string; projects: string; experience: string; education: string; skills: string; veille: string; contact: string };
  heroTitle: string;
  heroSub: string;
  ctaCV: string;
  ctaContact: string;
  about: string;
  projectsTitle: string;
  experienceTitle: string;
  educationTitle: string;
  skillsTitle: string;
  veilleTitle: string;
  contactTitle: string;
  contactBlurb: string;
  form: { name: string; email: string; message: string; send: string };
  footer: string;
  cvPath: string;
  cvFilename: string;
};

export type AllDict = Readonly<Record<Lang, Dict>>;

export type Experience = {
  roleFR: string;
  roleEN: string;
  org: string;
  location?: string;
  timeframe: string;
  pointsFR: string[];
  pointsEN: string[];
};

export type Education = {
  diplomaFR: string;
  diplomaEN: string;
  school: string;
  timeframe: string;
  location?: string;
  detailsFR?: string[];
  detailsEN?: string[];
};

export type Project = {
  title: string;
  timeframe?: string;
  location?: string;
  descriptionFR?: string;
  descriptionEN?: string;
  stack?: string[];
  demo?: string;
  repo?: string;
  caseStudy?: string;
  evidence?: "private_repo" | "not_hosted" | "coming_soon";
};

export type SkillGroup = {
  label?: string;
  labelFR?: string;
  labelEN?: string;
  icon?: string;
  items: string[];
};

export type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
