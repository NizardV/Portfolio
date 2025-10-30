// lib/dict.ts
export const veilleDict = {
  fr: {
    title: "Veille Informationnelle",
    allCats: "Toutes",
    allDates: "Toutes",
    filters: {
      date: "Date",
      category: "Catégorie",
      compact: "Compact",
    },
    ranges: {
      "24h": "Dernières 24h",
      "7j": "7 derniers jours",
      "30j": "30 derniers jours",
      "Semaine": "Cette semaine",
      "Mois": "Ce mois-ci",
    },
    none: "Aucun résultat.",
  },
  en: {
    title: "Information Monitoring",
    allCats: "All",
    allDates: "All",
    filters: {
      date: "Date",
      category: "Category",
      compact: "Compact view",
    },
    ranges: {
      "24h": "Last 24h",
      "7j": "Last 7 days",
      "30j": "Last 30 days",
      "Semaine": "This week",
      "Mois": "This month",
    },
    none: "No results found.",
  },
};
export type Lang = keyof typeof veilleDict;
