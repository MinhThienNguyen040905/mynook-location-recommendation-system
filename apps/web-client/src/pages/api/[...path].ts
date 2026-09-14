import type { NextApiRequest, NextApiResponse } from 'next';
import { handler } from '@mynook/serverless-api';

export const config = {
  api: { bodyParser: false, externalResolver: true, responseLimit: '4mb' },
  maxDuration: 60,
};

export default function api(req: NextApiRequest, res: NextApiResponse) {
  return handler(req as never, res as never);
}
