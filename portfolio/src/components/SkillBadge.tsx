"use client";

import { Badge } from "@/components/ui/badge";
import test from "node:test";
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
    // --- Frameworks & Langages ---
    "react": "react",
    "nextjs": "nextdotjs",
    "next": "nextdotjs",
    "tailwindcss": "tailwindcss",
    "csharp": "csharp",
    "c♯": "csharp",
    "c#": "csharp",
    "dotnet": "dotnet",
    ".net": "dotnet",
    ".net9": "dotnet",
    ".netcore": "dotnet",
    "aspnetcore": "dotnet",
    "php": "php",
    "laravel": "laravel",
    "linq": "dotnet",
    "efcore": "dotnet",
    "terminalgui": "windowsterminal",
    "xamarin": "xamarin",
    "typescript": "typescript",
    "framermotion": "react",
    "shadcnui": "shadcnui",
    "shadcn": "shadcnui",
    "shadcn/ui": "shadcnui",

    // --- Bases de données ---
    "sqlserver": "sqlserver",
    "mssql": "sqlserver",
    "postgresql": "postgresql",
    "postgres": "postgresql",
    "mysql": "mysql",
    "mariadb": "mariadb",
    "dbeaver": "dbeaver",

    // --- DevOps / Infra ---
    "docker": "docker",
    "dockercompose": "docker",
    "github": "github",
    "gitlab": "gitlab",
    "git": "git",
    "nginx": "nginx",
    "apache": "apache",
    "azure": "microsoftazure",
    "microsoftazure": "microsoftazure",
    "azuredevops": "azuredevops",
    "githubactions": "githubactions",
    "microsoftazuredevops": "azuredevops",

    // --- Tests / Qualité ---
    "xunit": "testing",
    "nunit": "testing",
    "mstests": "testing",
    "mstest": "testing",
    "phpunit": "testing",
    "jest": "jest",
    "unittest": "testing",

    // --- Méthodes / Outils ---
    "scrum": "scrum",
    "userstories": "scrum",
    "userstoriesru": "scrum",
    "documentation": "readthedocs",
    "codereview": "github",
    "bookstack": "bookstack",
    "readthedocs": "readthedocs",

    // --- Environnements & IDE ---
    "visualstudio": "visualstudio",
    "vscode": "visualstudiocode",
    "visualstudiocode": "visualstudiocode",
    "postman": "postman",
    "linux": "linux",
    "windowsterminal": "windowsterminal",
};

function normalizeLabel(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")  // supprime le contenu entre parenthèses
    .replace(/[\s\.\+_]/g, "")// retire espaces, points, +, _
    .replace(/-/g, "")        // retire tirets
    .replace(/#/g, "sharp");  // c# -> csharp
}

function resolveIconKeyFromJson(raw?: string): IconKey | null {
    if (!raw) return null;
    const k = stripLibPrefix(norm(raw)); // "SiDotnet" -> "dotnet" ; "next.js" -> "nextjs"
    const alias = iconKeyAlias[k];
    if (alias && alias in iconMap) return alias;
    // tentative d’accès direct si jamais la clé correspond déjà
    return (k in iconMap ? (k as IconKey) : null);
}

interface SkillBadgeProps {
    item: string | { label: string; icon?: string };
}

export default function SkillBadge({ item }: SkillBadgeProps) {
    const label = typeof item === "string" ? item : item.label;

    let Icon = null as React.ComponentType<any> | null;

    if (typeof item === "object" && item.icon) {
        const key = resolveIconKeyFromJson(item.icon);
        if (key) Icon = iconMap[key];
    }

    if (!Icon) {
        const key = iconKeyAlias[normalizeLabel(label)];
        if (key && iconMap[key]) Icon = iconMap[key];
    }

    if (!Icon && typeof item === "object" && item.icon) {
        console.warn("[SkillBadge] Icon inconnue:", item.icon, "pour label:", label);
    }

    return (
        <Badge
            variant="outline"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-white/90 border-white/20
                        hover:border-cyan-400 hover:text-cyan-300 transition-colors duration-200"
        >
            {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
            {label}
        </Badge>
    );
}
