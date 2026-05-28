export type Verfuegbarkeit = "Verfügbar" | "Reserviert" | "Verkauft";
export type Genre =
  | "Abstrakt" | "Akt" | "Landschaft" | "Menschen"
  | "Pfalz" | "Portrait" | "Städte" | "Stilleben" | "Sonstiges";

export interface Kuenstler {
  id: number;
  db_ident: string;
  db_name: string;
  db_vorname: string;
  db_beruf?: string;
  db_leben?: string;
  db_kommentar?: string;
  db_ausstellungen?: string;
  db_email?: string;
  db_adresse?: string;
  db_instagram?: string;
  db_facebook?: string;
  db_webseite?: string;
  portrait_foto?: string;
  kuenstlertyp: "VorOrt" | "Galerie" | "Eigenbestand";
}

export interface Bild {
  id: number;
  bild_nr: string;
  bildtitel: string;
  anmerkung_bild?: string;
  bildtechnik: string;
  genre: Genre;
  anzahl: number;
  hoehe_rahmen_cm: number;
  breite_rahmen_cm: number;
  hoehe_cm?: number;
  breite_cm?: number;
  tiefe_cm?: number;
  gewicht_kg?: number;
  verkaufspreis?: number;
  bild_url_web?: string;
  verfuegbarkeit: Verfuegbarkeit;
  kuenstler_id: number;
  kuenstler?: Kuenstler;
  einlieferungspreis?: number;
  verkaufspreis_vorschlag?: number;
  freigegeben?: boolean;
}

export interface ReservierungCreate {
  bild_id: number;
  vorname: string;
  name: string;
  email: string;
  telefon?: string;
}

export interface KaufCreate {
  bild_id: number;
  reservierung_id?: number;
  kaeufer_titel?: string;
  kaeufer_vorname: string;
  kaeufer_name: string;
  kaeufer_strasse: string;
  kaeufer_plz: string;
  kaeufer_ort: string;
  kaeufer_email: string;
  zahlungsart: "PayPal" | "Kreditkarte" | "Überweisung";
}
