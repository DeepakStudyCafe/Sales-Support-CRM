import { Router } from 'express';
import multer from 'multer';
import { bulkController } from '../controllers/bulk.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = Router();

// Excel Template Download
router.get('/template/:module', (req, res) => bulkController.downloadTemplate(req, res));

// Excel / JSON Bulk Import
router.post('/import/:module', upload.single('file'), (req, res) => bulkController.importData(req, res));

// Excel Bulk Export
router.post('/export/:module', (req, res) => bulkController.exportData(req, res));

// Module-Specific Bulk Action
router.post('/action', (req, res) => bulkController.executeBulkAction(req, res));

export default router;
