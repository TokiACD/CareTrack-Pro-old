// Simplified notification service without SSE
// This maintains the interface but removes all real-time functionality
// Data updates are now handled through smart refresh on the frontend

export interface NotificationData {
  id: string
  type: 'CARER_ACCEPTED' | 'INVITATION_STATUS' | 'USER_CREATED' | 'SYSTEM_UPDATE'
  title: string
  message: string
  data?: any
  timestamp: Date
  userId?: string
}

class NotificationService {
  constructor() {
    console.log('📝 Notification service initialized (SSE disabled - using smart refresh)')
  }

  // Placeholder methods that maintain API compatibility but don't send notifications
  // The frontend now uses smart refresh triggers instead of real-time notifications

  notifyCarerAccepted(carerData: any, adminUserId?: string) {
    console.log('📝 [NOTIFICATION] Carer accepted (smart refresh will handle UI updates):', {
      carerName: carerData.name,
      carerEmail: carerData.email
    })
    // No SSE broadcasting - frontend refreshes on focus/navigation
  }

  notifyInvitationStatusChange(invitationData: any, adminUserId?: string) {
    console.log('📝 [NOTIFICATION] Invitation status changed (smart refresh will handle UI updates):', {
      email: invitationData.email,
      status: invitationData.status
    })
    // No SSE broadcasting - frontend refreshes on focus/navigation
  }

  notifyUserCreated(userData: any, userType: 'admin' | 'carer', adminUserId?: string) {
    console.log('📝 [NOTIFICATION] User created (smart refresh will handle UI updates):', {
      userName: userData.name,
      userEmail: userData.email,
      userType
    })
    // No SSE broadcasting - frontend refreshes on focus/navigation
  }

  // Connection management methods (now no-ops for backwards compatibility)
  addSSEConnection(connectionId: string, res: any, userId?: string) {
    console.log('📝 [NOTIFICATION] SSE connection attempt ignored (smart refresh mode)')
  }

  removeSSEConnection(connectionId: string, userId?: string) {
    console.log('📝 [NOTIFICATION] SSE disconnection ignored (smart refresh mode)')
  }

  broadcast(notification: NotificationData) {
    console.log('📝 [NOTIFICATION] Broadcast ignored (smart refresh mode):', notification.type)
  }

  sendToUser(userId: string, notification: NotificationData) {
    console.log('📝 [NOTIFICATION] User notification ignored (smart refresh mode):', {
      userId,
      type: notification.type
    })
  }

  getStats() {
    return {
      totalConnections: 0,
      connectedUsers: 0,
      timestamp: new Date()
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

// Remove SSE endpoint handler since we no longer need it
export const createSSEHandler = () => {
  return (req: any, res: any) => {
    // Return 404 for SSE endpoints since we're using smart refresh now
    res.status(404).json({
      success: false,
      message: 'SSE endpoints disabled - using smart refresh system'
    })
  }
}