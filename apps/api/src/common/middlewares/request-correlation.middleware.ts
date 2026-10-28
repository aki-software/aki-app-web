import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestCorrelationContext } from '../context/request-correlation.context.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

@Injectable()
export class RequestCorrelationMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestCorrelationContext) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = requestIdFrom(req);
    res.setHeader('x-request-id', requestId);
    this.context.run(requestId, next);
  }
}

function requestIdFrom(req: Request): string {
  const value = req.headers['x-request-id'];
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
}
