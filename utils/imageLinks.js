/**
 * Enlaces de imagen de las opciones.
 *
 * Solo se aceptan enlaces directos de los servicios que sirven imagenes. La
 * razon no es el XSS (Angular ya sanea los `src` y nunca usamos
 * bypassSecurityTrust*), son dos cosas mas terrenales:
 *
 *   1. Una URL arbitraria convierte la tarjeta en un pixel de rastreo que le
 *      entrega la IP de cada votante a un tercero.
 *   2. Garantiza que el enlace sea de verdad una imagen. Este es el que mas
 *      se nota en la practica: el error habitual es pegar el enlace de la
 *      galeria o de la pagina, que en un <img> no pintan nada.
 *
 * Ampliar la lista es anadir un dominio aqui.
 */
const ALLOWED_IMAGE_HOSTS = ['i.postimg.cc', 'i.ibb.co'];

/** Tope por opcion. No es una cuota (las imagenes no son nuestras): es que una
 *  tarjeta con treinta miniaturas no hay quien la lea. */
const MAX_IMAGES_PER_OPTION = 10;

/** El mismo ancho que la columna `url`. */
const MAX_URL_LENGTH = 500;

/**
 * Devuelve la URL normalizada si es un enlace directo aceptable, o null.
 * Nunca lanza: cualquier basura entra y sale como null.
 */
function normalizeImageUrl(raw) {
    if (typeof raw !== 'string') return null;

    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }

    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_IMAGE_HOSTS.includes(parsed.hostname.toLowerCase())) return null;

    return parsed.toString().slice(0, MAX_URL_LENGTH);
}

/**
 * Limpia la lista que llega del cliente: descarta lo invalido, quita
 * repetidos y corta en el tope. El cliente ya filtra, pero quien manda es
 * esto: la peticion puede venir de cualquier sitio.
 */
function sanitizeImageList(list) {
    if (!Array.isArray(list)) return [];

    const out = [];
    const seen = new Set();

    for (const candidate of list) {
        const url = normalizeImageUrl(candidate);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        out.push(url);
        if (out.length >= MAX_IMAGES_PER_OPTION) break;
    }

    return out;
}

module.exports = {
    ALLOWED_IMAGE_HOSTS,
    MAX_IMAGES_PER_OPTION,
    MAX_URL_LENGTH,
    normalizeImageUrl,
    sanitizeImageList
};
