const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const verifyToken = (req, res, next) => {
    // 1. Buscar el token en los encabezados de la petición
    const token = req.header('auth-token');

    // 2. Si no hay token que no pase
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Falta el token.' });
    }

    try {
        // 3. Verificar si el token es válido usando clave
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Si es válido, guardamos los datos del usuario en la petición (req.user)
        req.user = verified;

        // 5. Dejar pasar a la siguiente función
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token no válido o expirado.' });
    }
};

module.exports = verifyToken;