export interface ComboboxOption {
  readonly label: string;
  readonly detail?: string;
  readonly disabled?: boolean;
}

export interface Coincidencia {
  readonly antes: string;
  readonly coincide: string;
  readonly despues: string;
}

interface Plegado {
  readonly texto: string;
  readonly origen: readonly number[];
}

const DIACRITICOS = /\p{Diacritic}/gu;

function plegarPieza(pieza: string): string {
  return pieza.normalize("NFD").replace(DIACRITICOS, "").toLowerCase();
}

function plegar(texto: string): Plegado {
  let plegado = "";
  const origen: number[] = [];
  let indice = 0;
  for (const pieza of texto) {
    const convertida = plegarPieza(pieza);
    for (let n = 0; n < convertida.length; n++) origen.push(indice);
    plegado += convertida;
    indice += pieza.length;
  }
  origen.push(texto.length);
  return { texto: plegado, origen };
}

export function plegarTexto(texto: string): string {
  return plegar(texto).texto;
}

export function filtrarSugerencias(
  opciones: readonly ComboboxOption[],
  consulta: string,
): readonly ComboboxOption[] {
  const buscado = plegarTexto(consulta).trim();
  if (!buscado) return opciones;
  return opciones.filter((opcion) =>
    plegarTexto(opcion.detail ? `${opcion.label} ${opcion.detail}` : opcion.label).includes(
      buscado,
    ),
  );
}

export function partirCoincidencia(texto: string, consulta: string): Coincidencia {
  const buscado = plegarTexto(consulta).trim();
  const plegado = plegar(texto);
  const posicion = buscado ? plegado.texto.indexOf(buscado) : -1;
  if (posicion < 0) return { antes: texto, coincide: "", despues: "" };
  const desde = plegado.origen[posicion];
  const hasta = plegado.origen[posicion + buscado.length];
  return {
    antes: texto.slice(0, desde),
    coincide: texto.slice(desde, hasta),
    despues: texto.slice(hasta),
  };
}
