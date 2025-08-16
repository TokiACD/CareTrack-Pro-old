import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Test endpoint to manually trigger SSE notifications
router.post('/test-sse',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      console.log('🧪 [TEST] Manual SSE notification test triggered');
      
      // Import notification service
      const { notificationService } = await import('../services/NotificationService');
      
      // Get connection stats
      const stats = notificationService.getStats();
      console.log('🧪 [TEST] SSE connection stats:', stats);
      
      // Send test carer accepted notification
      notificationService.notifyCarerAccepted({
        id: 'test-id',
        name: 'Test Carer',
        email: 'test@test.com',
        createdAt: new Date()
      });
      
      // Send test invitation status notification
      notificationService.notifyInvitationStatusChange({
        id: 'test-invitation-id',
        email: 'test@test.com',
        name: 'Test Carer',
        status: 'ACCEPTED',
        userType: 'CARER'
      });
      
      console.log('🧪 [TEST] Test notifications sent successfully');
      
      res.json({
        success: true,
        message: 'Test SSE notifications sent',
        connectionStats: stats
      });
      
    } catch (error) {
      console.error('🧪 [TEST] Failed to send test notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;