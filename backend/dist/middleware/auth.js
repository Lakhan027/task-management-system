import jwt from "jsonwebtoken";
const getCookieValue = (cookieHeader, name) => {
    if (!cookieHeader)
        return undefined;
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const cookie = cookies.find((item) => item.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split("=")[1]) : undefined;
};
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : undefined;
    const cookieToken = getCookieValue(req.headers.cookie, "token");
    const token = bearerToken || cookieToken;
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({
            message: "Invalid Token",
        });
    }
};
