const verifyAdmin = (req, res, next) => {
    // req.user is set by the auth middleware (verifyToken)
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
};

module.exports = verifyAdmin;
