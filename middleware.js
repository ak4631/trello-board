const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    const token = req.headers.token; // jwt
    if(!token){
        return res.status(403).json({
            "message":"No Token Found"
        })
    }
    const decoded = jwt.verify(token, "attlasiationsupersecret123123password");
    const userId = decoded.userId;
    if (userId) {
        req.userId = userId;
        next();
    } else {
        res.status(403).json({
            message: "Token was incorrect"
        })
    }
}

module.exports = {
    authMiddleware: authMiddleware
}