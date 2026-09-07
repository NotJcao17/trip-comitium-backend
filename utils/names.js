/**
 * Nombres de participante.
 *
 * El limite no viene de la base (la columna aguanta 50) sino de la pantalla:
 * un nombre largo descuadra los avatares redondos, la lista de quien voto y
 * sobre todo los chips arrastrables de la tier list, que se estiran hasta
 * romper la fila. 24 caracteres dan de sobra para un nombre o un apodo.
 *
 * Se rechaza en vez de recortar: en una sala abierta el nombre es tambien la
 * llave con la que se vuelve a entrar, y recortarlo en silencio dejaria al
 * participante escribiendo cada vez algo que ya no coincide con lo guardado.
 */
const MAX_PARTICIPANT_NAME = 24;

/** Quita los espacios de sobra, incluidos los del medio. */
function cleanParticipantName(raw) {
    if (typeof raw !== 'string') return '';
    return raw.trim().replace(/\s+/g, ' ');
}

/** Devuelve el mensaje de error, o null si el nombre sirve. */
function validateParticipantName(name) {
    if (!name) return 'El nombre no puede quedar vacio.';
    if ([...name].length > MAX_PARTICIPANT_NAME) {
        return `El nombre no puede pasar de ${MAX_PARTICIPANT_NAME} caracteres.`;
    }
    return null;
}

module.exports = { MAX_PARTICIPANT_NAME, cleanParticipantName, validateParticipantName };
