import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import rolesRoutes from './roles.routes';
import leadsRoutes from './leads.routes';
import customersRoutes from './customers.routes';
import callsRoutes from './calls.routes';
import ticketsRoutes from './tickets.routes';
import followupsRoutes from './followups.routes';
import notificationsRoutes from './notifications.routes';
import reportsRoutes from './reports.routes';
import auditRoutes from './audit.routes';
import settingsRoutes from './settings.routes';
import dashboardRoutes from './dashboard.routes';
import opportunitiesRoutes from './opportunities.routes';
import campaignsRoutes from './campaigns.routes';
import automationRoutes from './automation.routes';
import teamsRoutes from './teams.routes';
import bulkRoutes from './bulk.routes';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Webhook (no auth - validated by IVR signature or token)
router.use('/calls/webhook', callsRoutes);

// All remaining routes require authentication
router.use(authenticate);

// Core modules
router.use('/dashboard', dashboardRoutes);
router.use('/bulk', bulkRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/teams', teamsRoutes);
router.use('/leads', leadsRoutes);
router.use('/customers', customersRoutes);
router.use('/opportunities', opportunitiesRoutes);
router.use('/calls', callsRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/follow-ups', followupsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/automation', automationRoutes);
router.use('/reports', reportsRoutes);
router.use('/audit', auditRoutes);
router.use('/settings', settingsRoutes);

export default router;

