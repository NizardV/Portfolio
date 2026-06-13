import type React from "react";

export type Lang = "fr" | "en";

export type Dict = {
  nav: {
    about: string;
    projects: string;
    experience: string;
    education: string;
    skills: string;
    contact: string;
  };
  heroTitle: string;
  heroSub: string;
  ctaCV: string;
  cvPath: string;
  cvFilename: string;
  ctaContact: string;
  about: string;
  projectsTitle: string;
  projectsPersonalTitle?: string;
  experienceTitle: string;
  educationTitle: string;
  skillsTitle: string;
  contactTitle: string;
  contactBlurb: string;
  form: { name: string; email: string; message: string; send: string };
  footer: string;
};

export type AllDict = Readonly<Record<Lang, Dict>>;

export type StackItem = string | { label: string; icon?: string };

export type Experience = {
  roleFR: string;
  roleEN: string;
  org: string;
  location?: string;
  timeframe: string;
  stack?: StackItem[];
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
  stack?: StackItem[];
  demo?: string;
  repo?: string;
  caseStudy?: string;
  evidence?: "private_repo" | "not_hosted" | "coming_soon";
  personal?: boolean;
};

export type SkillGroup = {
  label?: string;
  labelFR?: string;
  labelEN?: string;
  icon?: string;
  items: StackItem[];
};

export type SectionIconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
