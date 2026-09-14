import type { IncomingMessage, ServerResponse } from 'node:http';
export function handler(req: IncomingMessage, res: ServerResponse): Promise<void>;
export function readPublicApi(path: string): Promise<Response>;
