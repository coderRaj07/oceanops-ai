import { Router } from 'express';
import voyageController from '../controllers/voyageController';
import feedbackController from '../controllers/feedbackController';
import maintenanceController from '../controllers/maintenanceController';

const router = Router();

router.post('/plan-voyage', voyageController.planVoyage);
router.get('/plan-history', voyageController.getHistory);
router.post('/feedback', feedbackController.submitFeedback);
router.get('/maintenance-alerts', maintenanceController.getAlerts);

export default router;
