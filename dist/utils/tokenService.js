"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveToken = saveToken;
exports.getTokens = getTokens;
const tokens = [];
async function saveToken(token) {
    tokens.unshift(token);
    if (tokens.length > 100)
        tokens.pop();
}
function getTokens(limit = 10) {
    return tokens.slice(0, limit);
}
