import jwt from 'jsonwebtoken';
import { JWTSECRET } from "$env/static/private";
const SECRET = JWTSECRET;

export function createToken(payload, expiresIn = '7d') {
	return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token) {
	try {
		return jwt.verify(token, SECRET);
	} catch {
		return null;
	}
}