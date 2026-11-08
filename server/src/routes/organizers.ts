import { Router } from 'express';
import type { Db } from 'mongodb';

import { toPublicOrganizer, type OrganizerDocument } from '../types/domain';

export function createOrganizersRouter(db: Db) {
  const router = Router();
  const organizers = db.collection<OrganizerDocument>('organizers');

  router.get('/', async (_req, res) => {
    const rows = await organizers.find().sort({ createdAt: -1 }).toArray();
    res.json({ data: rows.map(toPublicOrganizer) });
  });

  return router;
}
