import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get count of carers with confirmed shifts
router.get('/count',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // Get current date to filter only future or current shifts
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count unique carers who have confirmed shifts from today onwards
      // Using raw query to avoid Prisma groupBy issues
      const result = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT "carerId") as count
        FROM "RotaEntry" r
        INNER JOIN "Carer" c ON r."carerId" = c."id"
        WHERE r."isConfirmed" = true 
        AND r."date" >= ${today}
        AND c."isActive" = true
        AND c."deletedAt" IS NULL
      `;

      const count = Array.isArray(result) ? Number((result[0] as any)?.count) || 0 : 0;

      res.json({
        success: true,
        data: {
          confirmedCarersCount: count
        },
        message: `${count} carers have confirmed shifts`
      });
    } catch (error) {
      console.error('Error getting confirmed shifts count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get confirmed shifts count'
      });
    }
  }
);

// Get detailed breakdown of confirmed shifts
router.get('/details',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get detailed information about confirmed shifts using raw query
      const confirmedShifts = await prisma.$queryRaw`
        SELECT 
          r.id,
          r.date,
          r."shiftType",
          r."startTime",
          r."endTime",
          r."carerId",
          c.name as "carerName",
          c.email as "carerEmail",
          p.id as "packageId",
          p.name as "packageName",
          p.postcode as "packagePostcode"
        FROM "RotaEntry" r
        INNER JOIN "Carer" c ON r."carerId" = c.id
        INNER JOIN "CarePackage" p ON r."packageId" = p.id
        WHERE r."isConfirmed" = true 
        AND r.date >= ${today}
        AND c."isActive" = true
        AND c."deletedAt" IS NULL
        ORDER BY r.date ASC, r."startTime" ASC
      `;

      // Process results into grouped format
      const shiftArray = Array.isArray(confirmedShifts) ? confirmedShifts : [];
      
      const carerShiftSummary = (shiftArray as any[]).reduce((acc, shift) => {
        const carerId = shift.carerId;
        if (!acc[carerId]) {
          acc[carerId] = {
            carer: {
              id: carerId,
              name: shift.carerName,
              email: shift.carerEmail
            },
            confirmedShifts: []
          };
        }
        acc[carerId].confirmedShifts.push({
          id: shift.id,
          date: shift.date,
          shiftType: shift.shiftType,
          startTime: shift.startTime,
          endTime: shift.endTime,
          package: {
            id: shift.packageId,
            name: shift.packageName,
            postcode: shift.packagePostcode
          }
        });
        return acc;
      }, {} as Record<string, any>);

      const summaryArray = Object.values(carerShiftSummary);

      res.json({
        success: true,
        data: {
          confirmedCarersCount: summaryArray.length,
          totalConfirmedShifts: shiftArray.length,
          carerShiftDetails: summaryArray
        },
        message: `Found ${summaryArray.length} carers with ${shiftArray.length} confirmed shifts`
      });
    } catch (error) {
      console.error('Error getting confirmed shifts details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get confirmed shifts details'
      });
    }
  }
);

export { router as confirmedShiftsRoutes };