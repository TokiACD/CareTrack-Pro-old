import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, RotaPageData } from '@caretrack/shared';

interface CarePackage {
  id: string;
  name: string;
  postcode: string;
  isActive: boolean;
}

export const useRotaData = () => {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [packageFilter, setPackageFilter] = useState<string>('');
  const [carerFilter, setCarerFilter] = useState<string>('');
  
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Get current Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Fetch care packages
  const carePackagesQuery = useQuery({
    queryKey: ['care-packages'],
    queryFn: async () => {
      return await apiService.get<CarePackage[]>(API_ENDPOINTS.CARE_PACKAGES.LIST);
    }
  });

  // Fetch weekly schedule data when package is selected
  const weeklyDataQuery = useQuery({
    queryKey: ['weekly-schedule', selectedPackageId, currentWeekStart.toISOString()],
    queryFn: async () => {
      try {
        return await apiService.get<RotaPageData>(API_ENDPOINTS.ROTA.WEEKLY_SCHEDULE, {
          packageId: selectedPackageId,
          weekStart: currentWeekStart.toISOString()
        });
      } catch (error) {
        console.error('Error fetching weekly schedule:', error);
        throw error;
      }
    },
    enabled: Boolean(selectedPackageId),
    retry: 1
  });

  const handlePackageChange = (packageId: string) => {
    setSelectedPackageId(packageId);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const selectedPackage = carePackagesQuery.data?.find(pkg => pkg.id === selectedPackageId);

  // Transform the weekly data to ensure date is a string for the WeeklyCalendar component
  const transformedWeeklyData = weeklyDataQuery.data ? {
    ...weeklyDataQuery.data,
    entries: weeklyDataQuery.data.entries?.map(entry => ({
      ...entry,
      date: entry.date instanceof Date ? entry.date.toISOString().split('T')[0] : entry.date,
      carer: entry.carer || { id: '', name: '', email: '' }
    })) || []
  } as any : weeklyDataQuery.data;

  return {
    // State
    selectedPackageId,
    packageFilter,
    carerFilter,
    currentWeekStart,
    selectedPackage,
    
    // Queries
    carePackages: carePackagesQuery.data,
    isPackagesLoading: carePackagesQuery.isLoading,
    packagesError: carePackagesQuery.error,
    weeklyData: transformedWeeklyData,
    isWeeklyLoading: weeklyDataQuery.isLoading,
    weeklyError: weeklyDataQuery.error,
    refetchWeekly: weeklyDataQuery.refetch,
    
    // Handlers
    handlePackageChange,
    setPackageFilter,
    setCarerFilter,
    navigateWeek,
    goToCurrentWeek,
    formatWeekRange
  };
};