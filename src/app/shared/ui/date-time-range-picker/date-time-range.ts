export interface DateTimeSpan {
  readonly from: string;
  readonly to: string;
}

export interface DateTimeRange extends DateTimeSpan {
  readonly presetId?: string;
}

export interface DateTimeRangePreset {
  readonly id: string;
  readonly label: string;
  readonly resolve: (ahora: string) => DateTimeSpan;
}

const PATRON_INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/;
const PATRON_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

function comoInstante(fecha: Date): string {
  return `${fecha.toISOString().slice(0, 16)}:00Z`;
}

function diaLocal(instante: string, dias: number, hora = 0, minuto = 0): string {
  const f = new Date(instante);
  return comoInstante(
    new Date(f.getFullYear(), f.getMonth(), f.getDate() + dias, hora, minuto),
  );
}

export function esInstante(valor: string): boolean {
  if (!PATRON_INSTANTE.test(valor)) {
    return false;
  }
  const f = new Date(valor);
  return !Number.isNaN(f.getTime()) && comoInstante(f) === valor;
}

export function ahoraUTC(ahora = new Date()): string {
  return comoInstante(ahora);
}

export function aLocal(instante: string): string {
  const f = new Date(instante);
  if (Number.isNaN(f.getTime())) {
    return "";
  }
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

export function aInstante(local: string): string {
  if (!PATRON_LOCAL.test(local)) {
    return "";
  }
  const [fecha, reloj] = local.split("T");
  const [ano, mes, dia] = fecha.split("-").map(Number);
  const [hora, minuto] = reloj.split(":").map(Number);
  const f = new Date(ano, mes - 1, dia, hora, minuto);
  if (ano < 100) {
    f.setFullYear(ano);
  }
  if (Number.isNaN(f.getTime()) || f.getMonth() !== mes - 1 || f.getDate() !== dia) {
    return "";
  }
  return comoInstante(f);
}

export function sumarMinutos(instante: string, minutos: number): string {
  return comoInstante(new Date(new Date(instante).getTime() + minutos * 60_000));
}

export function sumarHoras(instante: string, horas: number): string {
  return sumarMinutos(instante, horas * 60);
}

export function sumarDiasLocal(instante: string, dias: number): string {
  const f = new Date(instante);
  return diaLocal(instante, dias, f.getHours(), f.getMinutes());
}

export function inicioDeDiaLocal(instante: string): string {
  return diaLocal(instante, 0);
}

export function finDeDiaLocal(instante: string): string {
  return diaLocal(instante, 0, 23, 59);
}

export function inicioDeSemanaLocal(instante: string): string {
  const dia = (new Date(instante).getDay() + 6) % 7;
  return diaLocal(instante, -dia);
}

export function inicioDeMesLocal(instante: string): string {
  const f = new Date(instante);
  return comoInstante(new Date(f.getFullYear(), f.getMonth(), 1));
}

export function finDeMesLocal(instante: string): string {
  const f = new Date(instante);
  return comoInstante(new Date(f.getFullYear(), f.getMonth() + 1, 0, 23, 59));
}

export function inicioDeAnoLocal(instante: string): string {
  return comoInstante(new Date(new Date(instante).getFullYear(), 0, 1));
}

export const RANGOS_HABITUALES_CON_HORA: readonly DateTimeRangePreset[] = [
  {
    id: "last15m",
    label: "Últimos 15 min",
    resolve: (ahora) => ({ from: sumarMinutos(ahora, -15), to: ahora }),
  },
  {
    id: "lastHour",
    label: "Última hora",
    resolve: (ahora) => ({ from: sumarHoras(ahora, -1), to: ahora }),
  },
  {
    id: "last24h",
    label: "Últimas 24 h",
    resolve: (ahora) => ({ from: sumarHoras(ahora, -24), to: ahora }),
  },
  {
    id: "today",
    label: "Hoy",
    resolve: (ahora) => ({ from: diaLocal(ahora, 0), to: ahora }),
  },
  {
    id: "yesterday",
    label: "Ayer",
    resolve: (ahora) => ({
      from: diaLocal(ahora, -1),
      to: diaLocal(ahora, -1, 23, 59),
    }),
  },
  {
    id: "last7",
    label: "Últimos 7 días",
    resolve: (ahora) => ({ from: diaLocal(ahora, -6), to: ahora }),
  },
  {
    id: "thisWeek",
    label: "Esta semana",
    resolve: (ahora) => ({ from: inicioDeSemanaLocal(ahora), to: ahora }),
  },
  {
    id: "thisMonth",
    label: "Este mes",
    resolve: (ahora) => ({ from: inicioDeMesLocal(ahora), to: ahora }),
  },
];

export function esRangoConHoraValido(from: string, to: string): boolean {
  return esInstante(from) && esInstante(to) && from <= to;
}

export function formatearRangoConHora(rango: DateTimeSpan): string {
  const { from, to } = rango;
  if (!esRangoConHoraValido(from, to)) {
    return "";
  }
  const fechaHora = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const desde = fechaHora.format(new Date(from));
  if (aLocal(from).slice(0, 10) === aLocal(to).slice(0, 10)) {
    const soloHora = new Intl.DateTimeFormat("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${desde} – ${soloHora.format(new Date(to))}`;
  }
  return `${desde} – ${fechaHora.format(new Date(to))}`;
}
