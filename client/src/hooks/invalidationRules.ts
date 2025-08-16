/**
 * Centralized invalidation rules for mutation-based cache management
 * Maps mutation types to the query keys that should be invalidated
 */

// Entity relationship groups
export const ENTITY_GROUPS = {
  USER_RELATED: ['users', 'invitations', 'audit-logs'],
  CARE_RELATED: ['packages', 'service-users', 'care-plans', 'assignments'],
  TASK_RELATED: ['tasks', 'assignments', 'schedules'],
  ASSESSMENT_RELATED: ['assessments', 'competencies', 'training', 'assignments']
} as const;

// Specific invalidation rules for each mutation type
export const INVALIDATION_RULES = {
  // User-related mutations
  'users.update': ['users', 'invitations', 'audit-logs'],
  'users.create': ['users', 'invitations'],
  'users.delete': ['users', 'invitations', 'assignments', 'audit-logs', 'recycle-bin', 'recycle-bin-summary'],
  'users.email-change': ['users', 'invitations'],
  
  // Carer-specific mutations
  'carers.create': ['carers', 'users', 'assignments'],
  'carers.update': ['carers', 'users', 'assignments', 'competencies'],
  'carers.delete': ['carers', 'users', 'assignments', 'recycle-bin', 'recycle-bin-summary'],
  
  // Invitation mutations
  'invitations.create': ['invitations'],
  'invitations.accept': ['invitations', 'users'],
  'invitations.decline': ['invitations'],
  'invitations.resend': ['invitations'],
  'invitations.delete': ['invitations'],
  
  // Care Package mutations
  'packages.create': ['packages', 'assignments'],
  'packages.update': ['packages', 'assignments', 'schedules', 'assessments'],
  'packages.delete': ['packages', 'assignments', 'schedules', 'recycle-bin', 'recycle-bin-summary'],
  
  // Service User mutations
  'service-users.create': ['service-users', 'care-plans'],
  'service-users.update': ['service-users', 'care-plans', 'assignments'],
  'service-users.delete': ['service-users', 'care-plans', 'assignments'],
  
  // Task mutations
  'tasks.create': ['tasks', 'schedules'],
  'tasks.update': ['tasks', 'schedules', 'assignments', 'assessments'],
  'tasks.delete': ['tasks', 'schedules', 'assignments', 'recycle-bin', 'recycle-bin-summary'],
  
  // Assignment mutations
  'assignments.create': ['assignments', 'available-carers', 'available-tasks', 'schedules', 'packages', 'users', 'progress'],
  'assignments.update': ['assignments', 'available-carers', 'available-tasks', 'schedules', 'packages', 'users', 'progress'],
  'assignments.delete': ['assignments', 'available-carers', 'available-tasks', 'schedules', 'packages', 'users', 'progress'],
  
  // Assessment mutations
  'assessments.create': ['assessments', 'competencies', 'assignments'],
  'assessments.update': ['assessments', 'competencies', 'assignments'],
  'assessments.delete': ['assessments', 'competencies', 'recycle-bin', 'recycle-bin-summary'],
  'assessments.submitResponse': ['assessments', 'competencies', 'assignments', 'carer-progress', 'carers'],
  'assessments.updateResponse': ['assessments', 'competencies', 'assignments', 'carer-progress', 'carers'],
  'assessments.saveDraft': ['assessment-draft'],
  'assessments.deleteDraft': ['assessment-draft'],
  
  // Competency mutations
  'competencies.update': ['competencies', 'assessments', 'assignments'],
  'competencies.create': ['competencies', 'assessments'],
  
  // Audit log mutations (usually read-only, but included for completeness)
  'audit-logs.create': ['audit-logs'],
  
  // Recycle bin mutations
  'recycle-bin.restore': ['recycle-bin', 'recycle-bin-summary', 'users', 'carers', 'packages', 'tasks', 'assessments', 'admin-users', 'assignments', 'carers-ready-for-assessment'],
  'recycle-bin.bulk-restore': ['recycle-bin', 'recycle-bin-summary', 'users', 'carers', 'packages', 'tasks', 'assessments', 'admin-users', 'assignments', 'carers-ready-for-assessment'],
  'recycle-bin.delete': ['recycle-bin', 'recycle-bin-summary'],
  'recycle-bin.cleanup': ['recycle-bin', 'recycle-bin-summary']
} as const;

// Helper function to get queries to invalidate for a mutation
export const getQueriesToInvalidate = (mutationType: keyof typeof INVALIDATION_RULES): string[] => {
  return [...(INVALIDATION_RULES[mutationType] || [])];
};

// Helper function to invalidate an entire entity group
export const getEntityGroupQueries = (group: keyof typeof ENTITY_GROUPS): readonly string[] => {
  return ENTITY_GROUPS[group];
};

// Utility to combine multiple invalidation rules
export const combineInvalidationRules = (...mutationTypes: (keyof typeof INVALIDATION_RULES)[]): string[] => {
  const combined = new Set<string>();
  mutationTypes.forEach(type => {
    getQueriesToInvalidate(type).forEach(query => combined.add(query));
  });
  return Array.from(combined);
};

// Types for TypeScript support
export type MutationType = keyof typeof INVALIDATION_RULES;
export type EntityGroup = keyof typeof ENTITY_GROUPS;
export type QueryKey = string;