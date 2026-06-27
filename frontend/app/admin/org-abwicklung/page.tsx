"use client";
import { ChecklisteEditor } from "@/app/admin/_components/ChecklisteEditor";
import type { CheckSection } from "@/app/admin/_components/ChecklisteEditor";

const INITIAL_SECTIONS: CheckSection[] = [
  {
    id: "vorbereitung",
    title: "Vorbereitung & Planung",
    items: [
      { id: "raum-abstimmen", label: "Raumplanung mit Lions-Club abstimmen" },
      { id: "platzplan-erstellen", label: "Platzplan erstellen und kommunizieren" },
      { id: "bewerbung-kuenstler", label: "Bewerbungsunterlagen für Künstler erstellen" },
      { id: "anmeldefrist", label: "Anmeldefrist festlegen und kommunizieren" },
      { id: "drucksachen", label: "Flyer und Plakate in Auftrag geben / bestellen" },
      { id: "presse", label: "Presse-Ankündigung vorbereiten und versenden" },
      { id: "helfer-planung", label: "Helfer-Einteilung planen" },
    ],
  },
  {
    id: "kuenstler-kommunikation",
    title: "Künstlerkommunikation",
    items: [
      { id: "einladung", label: "Einladungsschreiben an Künstler versenden" },
      { id: "erinnerung-anmeldung", label: "Erinnerung vor Anmeldeschluss versenden" },
      { id: "platzzuteilung", label: "Platzzuteilungen an Künstler kommunizieren" },
      { id: "technik-hinweise", label: "Hinweise zu Aufhängematerial und Technik versenden" },
      { id: "logins", label: "Logins für Künstler-Portal einrichten und zustellen" },
    ],
  },
  {
    id: "aufbau",
    title: "Veranstaltungstag — Aufbau",
    items: [
      { id: "aufbau-koordination", label: "Aufbau koordinieren (wer, wann, wo)" },
      { id: "bilder-haengen", label: "Bilder hängen und Kunstwerke aufstellen" },
      { id: "bildaufsteller", label: "Beschriftungen und Bildaufsteller aufstellen" },
      { id: "beschilderung", label: "Beschilderung im Gebäude anbringen" },
      { id: "kasse-einrichten", label: "Kasse und Kassenbereich einrichten" },
      { id: "technik-check", label: "Technik-Check: Internet, Tablet, Drucker" },
    ],
  },
  {
    id: "betrieb",
    title: "Veranstaltungstag — Betrieb",
    items: [
      { id: "einlass", label: "Einlass und Besucherbetreuung sicherstellen" },
      { id: "kasse-betrieb", label: "Kasse betreiben und Einnahmen sichern" },
      { id: "kuenstler-betreuung", label: "Künstler vor Ort betreuen" },
      { id: "social-media", label: "Öffentlichkeitsarbeit / Social Media" },
      { id: "abbau", label: "Abbau organisieren und durchführen" },
    ],
  },
  {
    id: "nachbereitung",
    title: "Nachbereitung",
    items: [
      { id: "abrechnung", label: "Erlös-Abrechnung erstellen" },
      { id: "datev", label: "DATEV-Export durchführen" },
      { id: "kuenstler-info", label: "Künstler über Verkäufe informieren" },
      { id: "kaufanfragen", label: "Offene Kaufanfragen abschließen" },
      { id: "fotos", label: "Fotos und Dokumentation sichern" },
      { id: "dankesschreiben", label: "Dankesschreiben an Künstler versenden" },
      { id: "feedback", label: "Feedback-Runde intern durchführen" },
    ],
  },
];

export default function OrgAbwicklungPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ChecklisteEditor
        storageKey="org-abwicklung-v1"
        initialSections={INITIAL_SECTIONS}
        title="Organisation und Abwicklung"
        subtitle="Veranstaltungsplanung — Fortschritt wird lokal gespeichert"
        editableTitle
      />
    </div>
  );
}
