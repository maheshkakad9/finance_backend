import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../config/redis";
import { env } from "../config/env";
import type { RedisReply } from "rate-limit-redis";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
    prefix: "rl:api:",
  }),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
    prefix: "rl:auth:",
  }),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many authentication attempts. Please try again in 15 minutes.",
    });
  },
});
