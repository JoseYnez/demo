export interface DateSpan {
  readonly from: string;
  readonly to: string;
}

export interface DateRange extends DateSpan {
  readonly presetId?: string;
}

export interface DateRangePreset {
  readonly id: string;
  readonly label: string;
  readonly resolve: (hoy: string) => DateSpan;
}

const PATRON_ISO = /^\d{4}-\d{2}-\d{2}$/;

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

function aUTC(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function aISO(ms: number): string {
  const fecha = new Date(ms);
  return `${fecha.getUTCFullYear()}-${dos(fecha.getUTCMonth() + 1)}-${dos(fecha.getUTCDate())}`;
}

export function esISO(valor: string): boolean {
  return PATRON_ISO.test(valor) && aISO(aUTC(valor)) === valor;
}

export function hoyISO(ahora = new Date()): string {
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

export function sumarDias(iso: string, dias: number): string {
  return aISO(aUTC(iso) + dias * 86_400_000);
}

export function sumarMeses(iso: string, meses: number): string {
  const fecha = new Date(aUTC(iso));
  const mes = fecha.getUTCMonth() + meses;
  const ultimo = new Date(Date.UTC(fecha.getUTCFullYear(), mes + 1, 0)).getUTCDate();
  return aISO(
    Date.UTC(
      fecha.getUTCFullYear(),
      mes,
      Math.min(fecha.getUTCDate(), ultimo),
    ),
  );
}

export function inicioDeSemana(iso: string): string {
  const dia = new Date(aUTC(iso)).getUTCDay();
  return sumarDias(iso, -((dia + 6) % 7));
}

export function finDeSemana(iso: string): string {
  return sumarDias(inicioDeSemana(iso), 6);
}

export function inicioDeMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function finDeMes(iso: string): string {
  const fecha = new Date(aUTC(iso));
  return aISO(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0));
}

export function inicioDeAno(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}

export function finDeAno(iso: string): string {
  return `${iso.slice(0, 4)}-12-31`;
}

export const RANGOS_HABITUALES: readonly DateRangePreset[] = [
  { id: "today", label: "Hoy", resolve: (hoy) => ({ from: hoy, to: hoy }) },
  {
    id: "yesterday",
    label: "Ayer",
    resolve: (hoy) => ({ from: sumarDias(hoy, -1), to: sumarDias(hoy, -1) }),
  },
  {
    id: "last7",
    label: "Últimos 7 días",
    resolve: (hoy) => ({ from: sumarDias(hoy, -6), to: hoy }),
  },
  {
    id: "last30",
    label: "Últimos 30 días",
    resolve: (hoy) => ({ from: sumarDias(hoy, -29), to: hoy }),
  },
  {
    id: "thisWeek",
    label: "Esta semana",
    resolve: (hoy) => ({ from: inicioDeSemana(hoy), to: hoy }),
  },
  {
    id: "thisMonth",
    label: "Este mes",
    resolve: (hoy) => ({ from: inicioDeMes(hoy), to: hoy }),
  },
  {
    id: "lastMonth",
    label: "El mes pasado",
    resolve: (hoy) => {
      const anterior = sumarMeses(inicioDeMes(hoy), -1);
      return { from: anterior, to: finDeMes(anterior) };
    },
  },
  {
    id: "thisYear",
    label: "Este año",
    resolve: (hoy) => ({ from: inicioDeAno(hoy), to: hoy }),
  },
];

export function esRangoValido(from: string, to: string): boolean {
  return esISO(from) && esISO(to) && from <= to;
}

const DIA_MES_ANO = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DIA_MES = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const DIA = new Intl.DateTimeFormat("es", { day: "numeric", timeZone: "UTC" });

export function formatearRango(rango: DateSpan): string {
  const { from, to } = rango;
  if (!esRangoValido(from, to)) {
    return "";
  }
  const desde = aUTC(from);
  const hasta = aUTC(to);
  if (from === to) {
    return DIA_MES_ANO.format(hasta);
  }
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${DIA.format(desde)} – ${DIA_MES_ANO.format(hasta)}`;
  }
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return `${DIA_MES.format(desde)} – ${DIA_MES_ANO.format(hasta)}`;
  }
  return `${DIA_MES_ANO.format(desde)} – ${DIA_MES_ANO.format(hasta)}`;
}
