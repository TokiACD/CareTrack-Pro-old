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
  'users.delete': ['users', 'invitations', 'assignments', 'audit-logs'],
  'users.email-change': ['users', 'invitations'],
  
  // Invitation mutations
  'invitations.create': ['invitations'],
  'invitations.accept': ['invitations', 'users'],
  'invitations.decline': ['invitations'],
  'invitations.resend': ['invitations'],
  'invitations.delete': ['invitations'],
  
  // Care Package mutations
  'packages.create': ['packages', 'assignments'],
  'packages.update': ['packages', 'assignments', 'schedules', 'assessments'],
  'packages.delete': ['packages', 'assignments', 'schedules'],
  
  // Service User mutations
  'service-users.create': ['service-users', 'care-plans'],
  'service-users.update': ['service-users', 'care-plans', 'assignments'],
  'service-users.delete': ['service-users', 'care-plans', 'assignments'],
  
  // Task mutations
  'tasks.create': ['tasks', 'schedules'],
  'tasks.update': ['tasks', 'schedules', 'assignments', 'assessments'],
  'tasks.delete': ['tasks', 'schedules', 'assignments'],
  
  // Assignment mutations
  'assignments.create': ['assignments', 'schedules'],
  'assignments.update': ['assignments', 'schedules'],
  'assignments.delete': ['assignments', 'schedules'],
  
  // Assessment mutations
  'assessments.create': ['assessments', 'competencies', 'assignments'],
  'assessments.update': ['assessments', 'competencies', 'assignments'],
  'assessments.delete': ['assessments', 'competencies'],
  
  // Competency mutations
  'competencies.update': ['competencies', 'assessments', 'assignments'],
  'competencies.create': ['competencies', 'assessments'],
  
  // Audit log mutations (usually read-only, but included for completeness)
  'audit-logs.create': ['audit-logs']
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