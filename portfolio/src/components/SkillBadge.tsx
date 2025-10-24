"use client";

import * as React from "react";
import type { IconType } from "react-icons";
import { Badge } from "@/components/ui/badge";

// FontAwesome / SimpleIcons / etc.
import { FaCode, FaDatabase, FaServer, FaTools } from "react-icons/fa";
import { GrTest } from "react-icons/gr";
import { DiScrum } from "react-icons/di";
import {
  SiReact,
  SiTailwindcss,
  SiDotnet,
  SiDocker,
  SiGithub,
  SiGitlab,
  SiLinux,
  SiNextdotjs,
  SiTypescript,
  SiMariadb,
  SiMysql,
  SiMicrosoftsqlserver,
  SiPostgresql,
  SiNginx,
  SiApache,
  SiVisualstudiocode,
  SiPostman,
  SiGit,
  SiBookstack,
  SiReadthedocs,
  SiScrumalliance,
  SiVisualstudio,
  SiCsharp,
  SiWindowsterminal,
  SiPhp,
  SiMicrosoftazure,
  SiAzuredevops,
  SiLaravel,
  SiDbeaver,
  SiGithubactions,
  SiTestinglibrary,
  SiJest,
  SiXamarin,
  SiShadcnui,
} from "react-icons/si";

/* -------------------- Icon maps & helpers -------------------- */

const iconMap = {
  code: FaCode,
  db: FaDatabase,
  server: FaServer,
  tools: FaTools,
  laravel: SiLaravel,
  react: SiReact,
  docker: SiDocker,
  sqlserver: SiMicrosoftsqlserver,
  postgresql: SiPostgresql,
  tailwindcss: SiTailwindcss,
  dotnet: SiDotnet,
  github: SiGithub,
  gitlab: SiGitlab,
  linux: SiLinux,
  nextdotjs: SiNextdotjs,
  typescript: SiTypescript,
  mariadb: SiMariadb,
  mysql: SiMysql,
  nginx: SiNginx,
  apache: SiApache,
  visualstudiocode: SiVisualstudiocode,
  postman: SiPostman,
  git: SiGit,
  bookstack: SiBookstack,
  readthedocs: SiReadthedocs,
  scrumalliance: SiScrumalliance,
  csharp: SiCsharp,
  windowsterminal: SiWindowsterminal,
  php: SiPhp,
  microsoftazure: SiMicrosoftazure,
  azuredevops: SiAzuredevops,
  visualstudio: SiVisualstudio,
  dbeaver: SiDbeaver,
  githubactions: SiGithubactions,
  testinglibrary: SiTestinglibrary,
  jest: SiJest,
  xamarin: SiXamarin,
  shadcnui: SiShadcnui,
  testing: GrTest,
  scrum: DiScrum,
} as const;

type IconKey = keyof typeof iconMap;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const stripLibPrefix = (k: string) => k.replace(/^(si|fa|fi|io|md|bi|tb|lu)/, "");

const iconKeyAlias: Record<string, IconKey> = {
  // Frameworks & Langages
  react: "react",
  nextjs: "nextdotjs",
  next: "nextdotjs",
  tailwindcss: "tailwindcss",
  csharp: "csharp",
  "c♯": "csharp",
  "c#": "csharp",
  dotnet: "dotnet",
  ".net": "dotnet",
  ".net9": "dotnet",
  ".netcore": "dotnet",
  aspnetcore: "dotnet",
  php: "php",
  laravel: "laravel",
  linq: "dotnet",
  efcore: "dotnet",
  terminalgui: "windowsterminal",
  xamarin: "xamarin",
  typescript: "typescript",
  framermotion: "react",
  shadcnui: "shadcnui",
  "shadcn/ui": "shadcnui",

  // Bases de données
  sqlserver: "sqlserver",
  mssql: "sqlserver",
  postgresql: "postgresql",
  postgres: "postgresql",
  mysql: "mysql",
  mariadb: "mariadb",
  dbeaver: "dbeaver",

  // DevOps / Infra
  docker: "docker",
  dockercompose: "docker",
  github: "github",
  gitlab: "gitlab",
  git: "git",
  nginx: "nginx",
  apache: "apache",
  azure: "microsoftazure",
  microsoftazure: "microsoftazure",
  azuredevops: "azuredevops",
  githubactions: "githubactions",
  microsoftazuredevops: "azuredevops",

  // Tests / Qualité
  xunit: "testing",
  nunit: "testing",
  mstests: "testing",
  mstest: "testing",
  phpunit: "testing",
  jest: "jest",
  unittest: "testing",

  // Méthodes / Outils
  scrum: "scrum",
  userstories: "scrum",
  userstoriesru: "scrum",
  documentation: "readthedocs",
  codereview: "github",
  bookstack: "bookstack",
  readthedocs: "readthedocs",

  // Environnements & IDE
  visualstudio: "visualstudio",
  vscode: "visualstudiocode",
  visualstudiocode: "visualstudiocode",
  postman: "postman",
  linux: "linux",
  windowsterminal: "windowsterminal",
};

function normalizeLabel(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // supprime le contenu entre parenthèses
    .replace(/[\s\.\+_]/g, "") // retire espaces, points, +, _
    .replace(/-/g, "") // retire tirets
    .replace(/#/g, "sharp"); // c# -> csharp
}

/** "SiDotnet" -> "dotnet", "next.js" -> "nextjs" */
function resolveIconKeyFromJson(raw?: string): IconKey | null {
  if (!raw) return null;
  const k = stripLibPrefix(norm(raw));
  const alias = iconKeyAlias[k];
  if (alias && alias in iconMap) return alias;
  return k in iconMap ? (k as IconKey) : null;
}

/* -------------------- Component -------------------- */

export interface SkillBadgeProps {
  /** soit "React", soit { label: "React", icon?: "react" } */
  item: string | { label: string; icon?: string };
  className?: string;
}

export default function SkillBadge({ item, className }: SkillBadgeProps) {
  const label = typeof item === "string" ? item : item.label;

  let Icon: IconType | null = null;

  // 1) icône explicite fournie dans le JSON
  if (typeof item === "object" && item.icon) {
    const key = resolveIconKeyFromJson(item.icon);
    if (key) Icon = iconMap[key];
  }

  // 2) déduction depuis le libellé si rien de fourni
  if (!Icon) {
    const key = iconKeyAlias[normalizeLabel(label)];
    if (key) Icon = iconMap[key];
  }

  return (
    <Badge
      variant="outline"
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/90 " +
        "border-white/20 hover:border-cyan-400 hover:text-cyan-300 " +
        "transition-colors duration-200 " +
        (className ?? "")
      }
      title={label}
    >
      {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {label}
    </Badge>
  );
}
