'use strict';

const crypto = require('node:crypto');

const COOKIE_NAME = 'rbh_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function authConfig() {
  const username = process.env.ADMIN_USERNAME || '';
  const password = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  return {
    username,
    password,
    secret,
    configured: Boolean(username && password && secret.length >= 32)
  };
}

function normalizeUsername(value) {
  return String(value || '').replace(/[\u00A0\u200B\u200E\s]+/g, ' ').trim().toLowerCase();
}

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ''), 'utf8');
  const right = Buffer.from(String(rightValue || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function credentialsMatch(username, password) {
  const config = authConfig();
  if (!config.configured) return false;
  return normalizeUsername(username) === normalizeUsername(config.username) &&
    safeEqual(String(password || ''), config.password);
}

function signature(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function isSecureRequest(req) {
  return Boolean(process.env.VERCEL) ||
    process.env.NODE_ENV === 'production' ||
    String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function cookieHeader(req, token, maxAge) {
  const parts = [
    COOKIE_NAME + '=' + token,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + String(maxAge)
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

function setSessionCookie(req, res, remember) {
  const config = authConfig();
  const ttl = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({
    sub: normalizeUsername(config.username),
    exp: Date.now() + ttl
  }), 'utf8').toString('base64url');
  const token = payload + '.' + signature(payload, config.secret);
  res.setHeader('Set-Cookie', cookieHeader(req, token, Math.floor(ttl / 1000)));
}

function clearSessionCookie(req, res) {
  res.setHeader('Set-Cookie', cookieHeader(req, '', 0));
}

function readCookie(req, name) {
  const cookieHeaderValue = String(req.headers.cookie || '');
  for (const pair of cookieHeaderValue.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() === name) {
      return pair.slice(separator + 1).trim();
    }
  }
  return '';
}

function isAuthenticated(req) {
  const config = authConfig();
  if (!config.configured) return false;

  const token = readCookie(req, COOKIE_NAME);
  const separator = token.lastIndexOf('.');
  if (!token || separator <= 0) return false;

  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  const expectedSignature = signature(payload, config.secret);
  if (!safeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.sub === normalizeUsername(config.username) &&
      Number.isFinite(data.exp) && data.exp > Date.now();
  } catch {
    return false;
  }
}

function isSameOrigin(req) {
  const origin=req.headers.origin;
  if(!origin) return true;
  let parsed;
  try { parsed=new URL(origin); } catch { return false; }
  if(parsed.protocol!=='https:'&&parsed.hostname!=='localhost') return false;
  const normalized=parsed.origin.toLowerCase();
  const configured=String(process.env.ADMIN_ALLOWED_ORIGINS||'').split(',').map(v=>v.trim().replace(/\/+$/,'').toLowerCase()).filter(Boolean);
  const publicOrigin=String(process.env.PUBLIC_SITE_ORIGIN||'').trim().replace(/\/+$/,'').toLowerCase();
  const explicit=new Set(['https://royal-banquet-hall.vercel.app','https://royal-banquet-hall-sanaulla7676s-projects.vercel.app','https://royal-banquet-hall-git-main-sanaulla7676s-projects.vercel.app',...configured,...(publicOrigin?[publicOrigin]:[])]);
  if(explicit.has(normalized)) return true;
  if(/^royal-banquet-hall-[a-z0-9-]+-sanaulla7676s-projects\.vercel\.app$/i.test(parsed.hostname)) return true;
  const host=req.headers['x-forwarded-host']||req.headers.host;
  return Boolean(host&&parsed.host.toLowerCase()===String(host).toLowerCase());
}



module.exports = {
  authConfig,
  credentialsMatch,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  isSameOrigin
};
