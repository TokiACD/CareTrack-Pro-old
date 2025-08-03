# CareTrack Pro - Complete Care Management Admin Dashboard Implementation Plan

## 🏗️ Project Architecture & Setup

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI + React Query + React Router
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL (complex relational data)
- **Authentication**: JWT + Email invite system
- **Additional**: Client-side PDF generation, drag-and-drop calendar, audit logging
- **Deployment**: Render (with managed PostgreSQL)

### Project Structure
```
CareTrack-Pro/
├── client/          # React frontend
├── server/          # Node.js backend
├── shared/          # Shared TypeScript types
├── prisma/          # Database schema & migrations
└── docs/           # Project documentation
```

## 🎯 **COMPLETE APPLICATION SPECIFICATION**

### **Admin Web Application Architecture**
**Access Control**: Email invite-only system (dev admin → other admins)
**Authentication**: Admin login page → Dashboard with 10 management cards
**Dashboard Summary**: Display carers at 90%+ task completion needing competency assessments

---

## 🗄️ Database Design (12+ Core Entities)

### Primary Entities
- **AdminUsers** - Email invite system, soft delete with timestamps
- **Carers** - User management, competency tracking, soft delete cascade rules
- **CarePackages** - Name + 3-digit postcode, soft delete with dependency checking
- **Tasks** - Target completion counts, soft delete with reference validation
- **Assessments** - 4-section structure (Knowledge, Practical, Emergency, Tasks)
- **CompetencyRatings** - Assessment outcomes + manual overrides with timestamps
- **TaskProgress** - Package-specific progress tracking (doesn't carry between packages)
- **Shifts** - Regular and competent-only shifts with cancellation handling
- **RotaEntries** - Calendar scheduling with complex rule validation
- **AuditLogs** - Comprehensive system activity tracking
- **Invitations** - Secure token-based user creation system

### Relationship Tables
- **CarerPackageAssignments** - Many-to-many with historical progress preservation
- **PackageTaskAssignments** - Many-to-many with reference tracking
- **AssessmentResponses** - Assessment answers storage with versioning

---

## 📋 **COMPLETE DASHBOARD CARDS SPECIFICATION**

### **1st Card - Users** ✅ **IMPLEMENTED**
- **Two-tab interface**: Admins and Carers tabs
- **Soft delete functionality**: Prevents app access until restored
- **Automatic search filtering**: Real-time search capabilities
- **Carer filter toggle**: "All Carers" vs "Fully Assessed Carers" 
  - Fully assessed = carers with complete competency ratings for ALL tasks on their care packages

### **2nd Card - Care Packages** ✅ **IMPLEMENTED**
- **CRUD operations**: Name + 3-digit postcode (data privacy compliance)
- **Soft delete functionality**: With dependency checking
- **Automatic search filtering**: Real-time search

### **3rd Card - Tasks** ✅ **IMPLEMENTED**
- **Task management**: Add task + target count (completions needed for 100%)
- **Soft delete functionality**: With reference validation
- **Automatic search filtering**: Real-time search

### **4th Card - Assignments** ✅ **IMPLEMENTED**
- **Care package selection interface**: Click package → assign carers/tasks
- **Many-to-many relationships**: 1 carer → multiple packages
- **Task assignments**: Tasks → packages with validation
- **Soft delete functionality**: With conflict resolution
- **Automatic search filtering**: Real-time search

### **5th Card - Assessments** ✅ **IMPLEMENTED**
- **4-section assessment builder**:
  - **Section 1 - Knowledge**: Question text + model answer (assessor guide)
  - **Section 2 - Practical Skills**: Skill description + "Not applicable" toggle slider
  - **Section 3 - Emergency**: Question text + model answer (assessor guide)
  - **Section 4 - Tasks**: Select covered tasks + choose 1 task to show assessment button on progress page
- **Soft delete functionality**: With reference checking

### **6th Card - Progress** 🔥 **NEXT PRIORITY** ⚠️ **MOST COMPLEX**

**Individual Carer Progress Interface:**
- **Multi-tab layout**: Care package tabs (if carer assigned to multiple packages)
- **Progress visualization**: Progress bars for each task with completion percentages
- **Task progress reset**: Individual "Reset Task Progress" buttons
- **PDF download**: Comprehensive progress reports for paper trail compliance

**Competency Assessment Workflow:**
- **Assessment trigger**: "Competency Assessment" button appears when tasks covered under assessment hit 100%
- **Assessment interface**:
  - **Knowledge section**: Display question + model answer + text field for carer answer
  - **Practical skills**: Multiple choice (Competent/Needs Support/N/A - if enabled during assessment creation)
  - **Emergency section**: Display question + model answer + text field for carer answer
  - **Outcome summary**: Admin selects competency level (Not Competent, Advanced Beginner, Competent, Proficient, Expert)
  - **Auto-fill assessor details**: Logged-in admin name + unique assessor ID

**Competency Management System:**
- **"Manage Competencies" button**: Manual competency override interface
- **Manual rating levels**: Not Assessed, Competent, Proficient, Expert
- **Reset functionality**: "Not Assessed" resets both competency rating AND task progress
- **Display system**: Show most recent competency rating (assessment result OR manual override)
- **Competency visibility**: Display ratings for each task on carer progress page

**PDF Generation & Notifications:**
- **PDF content**: Carer details + progress bars + assessment Q&A + competency results + assessor details
- **Notification system**: Send competency changes to carer app (requires confirmation)

### **7th Card - Shift Sender** 🔸 **HIGH PRIORITY**

**Shift Distribution System:**
- **Non-competent shifts**: 
  - Show all carers with "More Info" button displaying competency ratings for each task
  - Carer selection → "Send Shift" → fill shift details
- **Competent shifts**:
  - Task selection interface → shows carers competent+ in ALL selected tasks
  - Carer selection → "Send Shift" → fill shift details
- **Confirmation workflow**: Carers confirm availability (doesn't auto-assign - office contacts them)
- **Integration**: Send shifts to carer mobile platform

### **8th Card - Rota** ⚠️ **MOST COMPLEX FEATURE**

**Schedule Management Interface:**
- **Care package selection**: Choose package → opens weekly calendar view
- **Calendar functionality**: Drag-and-drop interface with next/previous week navigation
- **Shift types**: Day and night shifts (multiple carers per shift type per package)
- **Carer display system**:
  - **Tab 1**: Package-assigned carers with competency ratings
  - **Tab 2**: All other carers (for shift coverage)

**Complex Rule Validation Engine:**
- **Real-time error display**: Error box explaining rule violations
- **8 Scheduling Rules**:
  1. **Minimum staffing**: 1 competent staff member on at all times
  2. **Competency pairing**: Non-comp can only work with comp; Comp can work with anyone
  3. **Weekly hours**: 36-hour maximum per carer per week
  4. **Rotation pattern**: 1 week days → 1 week nights
  5. **Weekend restriction**: No consecutive weekends for same carer
  6. **Night shift flexibility**: Consecutive night shifts allowed
  7. **Rest periods**: No night→day shifts in same week unless 2+ days rest between
  8. **Day→night flexibility**: Day→night shifts allowed in same week

### **9th Card - Recycle Bin** 🔹 **MEDIUM PRIORITY**

**Soft Delete Management:**
- **Central repository**: All soft-deleted items with search filters
- **Restoration functionality**: Restore deleted items with conflict resolution
- **Permanent deletion**: After review and confirmation
- **Retention policy**: 30-day automatic cleanup
- **Search and filtering**: Find deleted items by type, date, user, etc.
- **Dependency warnings**: Show references before permanent deletion

### **10th Card - Audit Login** 🔹 **LOW PRIORITY**

**Activity Monitoring:**
- **Activity feed**: Recent system activity display
- **Activity types**: Items added, assessments completed, user actions, deletions, etc.
- **Search and filtering**: Filter by user, action type, date range
- **Real-time updates**: Live activity monitoring
- **Export functionality**: CSV/PDF export for compliance

---

## 🎯 **DASHBOARD SUMMARY REQUIREMENTS**

**Assessment Alert System:**
- **Target criteria**: Carers at 90%+ completion on ALL tasks for specific care package
- **Missing competency identification**: Carers still needing competency assessments
- **Package-specific tracking**: Task progress doesn't carry between packages
- **Admin notification**: Clear visibility of who needs assessment
- **Dashboard display**: Show alert cards for carers ready for assessment

---

## 🚀 Implementation Phases

### ✅ Phase 1: Core Infrastructure & UX Foundation (COMPLETE)
1. **Project Setup**
   - Monorepo with client/server/shared structure
   - Material-UI responsive breakpoints (mobile-first)
   - Global error handling system with standardized responses
   - Loading state components and skeleton loaders

2. **Database & Authentication**
   - Prisma schema with soft delete timestamps
   - JWT authentication with email invite system
   - Audit logging infrastructure
   - Connection monitoring with retry logic

3. **Core UX Systems**
   - Error boundary components
   - Toast notification system
   - Loading state management
   - Form validation with real-time feedback

### ✅ Phase 2: User Management & Invitations (COMPLETE)
- **Complete Invitation System**: Secure token-based user creation
- **Professional Email Templates**: Responsive HTML email design
- **SendGrid Email Service**: Production-ready email delivery
- **Invitation Database Model**: Secure tokens with expiration
- **Invitation API Endpoints**: Send, accept, decline functionality
- **Invitation Acceptance UI**: Multi-step user onboarding flow
- **Users Card Implementation**: Admin/Carer management with invite system
- **Email Service Configuration**: Both SendGrid and SMTP fallback

### ✅ Phase 3: Dashboard Cards 1-5 (COMPLETE)
- **Users Card**: Two-tab interface with "Fully Assessed" filter
- **Care Packages Card**: CRUD with 3-digit postcode validation
- **Tasks Card**: Target count management with progress foundation
- **Assignments Card**: Many-to-many relationship management
- **Assessments Card**: 4-section assessment builder with validation

### 🚧 Phase 4: Advanced Dashboard Cards 6-10 (IN PROGRESS)

**Priority 1: Progress Card (2-3 weeks)**
- Individual carer progress pages with package tabs
- Complete assessment workflow (4 sections + outcome)
- Competency management system with manual overrides
- PDF generation for compliance reports
- Notification system integration

**Priority 2: Rota Card (2-3 weeks)**
- Drag-and-drop calendar interface
- 8-rule validation engine with clear error messaging
- Carer assignment system with competency display
- Multi-tab carer selection (assigned vs available)

**Priority 3: Final Cards (1-2 weeks)**
- Shift Sender: Competency-based distribution system
- Recycle Bin: Soft delete management with 30-day retention
- Audit Login: Activity monitoring and reporting

### 🔸 Phase 5: Advanced Features & Integration (3-4 weeks)
- **Dashboard Summary**: 90%+ completion alerts with cached calculations
- **Carer App Integration**: Notification system for competency changes
- **Performance Optimization**: Progress calculation caching
- **Enhanced Error Recovery**: Auto-retry for failed operations
- **Advanced Search**: Cross-entity search functionality

### 🔹 Phase 6: Testing & Production (3-4 weeks)
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Rule Validation Testing**: All 8 scheduling rules with edge cases
- **Security Audit**: JWT security, input validation, SQL injection prevention
- **Performance Testing**: Load testing for target capacity
- **Production Deployment**: Render deployment with monitoring

---

## 🔧 Enhanced Technical Solutions

### Data Integrity & Edge Cases

**Soft Delete Cascade Rules:**
```typescript
// When carer is soft-deleted:
1. Cancel future shifts (with admin notification)
2. Mark current shifts as "requires replacement"
3. Block restore until shift conflicts resolved
4. Show warning: "This carer has 3 upcoming shifts"
```

**Competency Rating Priority System:**
```typescript
// Timestamp-based priority system
Rating hierarchy (most recent wins):
1. Manual override (always precedence + timestamp)
2. Assessment result (with completion date)
3. Previous manual rating
4. Default: Not Assessed
```

**Assignment Change Handling:**
```typescript
// Preserve historical progress
When assignment changes:
1. Keep existing progress data (don't delete)
2. Show: "Previous Package: 85% complete"
3. Start fresh progress for new package
4. Allow admin to transfer relevant progress if needed
```

### Performance & Scalability

**System Capacity Planning:**
- **Initial Targets**: 500 carers, 50 care packages, 100 tasks, 10 concurrent admins
- **Progress Calculation**: Cached results with smart invalidation
- **PDF Generation**: Client-side generation for immediate download
- **Database Optimization**: Indexed queries and connection pooling

**PDF Generation Strategy:**
```typescript
// Client-side PDF generation
1. Use jsPDF or react-pdf for browser generation
2. Generate and download immediately to admin PC
3. No server storage needed
4. Include: carer details, progress bars, assessment answers, competency ratings, assessor details
```

### Enhanced Error Handling

**Rule Violation Handling:**
- Clear, specific error messages with remediation steps
- Real-time validation during data entry
- Visual indicators for constraint violations
- Bulk operation error aggregation

**Loading States:**
- Skeleton loaders for complex calculations
- Progress indicators for PDF generation
- Debounced search with loading states
- Connection status indicators

### Mobile Responsiveness

**Mobile-First Design:**
- Responsive breakpoints using Material-UI system
- Touch-friendly drag operations for rota
- Collapsible card layouts for mobile
- Optimized forms for mobile input

---

## 📊 Success Metrics & Monitoring

### Technical Deliverables
- ✅ All 10 dashboard cards fully functional
- ✅ Complex competency assessment workflow operational
- ✅ 8-rule scheduling validation system working
- ✅ PDF generation for compliance reporting
- ✅ Real-time progress tracking system
- ✅ Carer app notification integration

### Business Value
- ✅ Complete care management workflow
- ✅ Competency tracking and assessment system
- ✅ Automated scheduling with rule compliance
- ✅ Audit trail for regulatory compliance
- ✅ Mobile-responsive admin interface

### Performance Targets
- **Functionality**: All 10 dashboard cards fully operational
- **Performance**: Sub-2-second response times for all operations
- **Reliability**: 99.9% uptime with graceful error handling
- **User Experience**: Mobile-responsive with intuitive error feedback
- **Data Integrity**: Zero data loss with proper cascade handling
- **Compliance**: Complete audit trail with PDF generation capability

---

## 🎯 Development Priorities & Timeline

### **Current Status: 50% Complete**
- **Phase 1**: ✅ Complete (Core Infrastructure)
- **Phase 2**: ✅ Complete (User Management & Invitations)
- **Phase 3**: ✅ Complete (Dashboard Cards 1-5)
- **Phase 4**: 🚧 In Progress (Dashboard Cards 6-10)

### **Critical Path (Next 8 weeks)**
- **Week 1-3**: Progress Card (most complex feature)
- **Week 4-6**: Rota Card (8 scheduling rules)
- **Week 7-8**: Final 3 cards (Shift Sender, Recycle Bin, Audit)

### Risk Mitigation
- **Complexity Management**: Phased delivery with working increments
- **Performance Issues**: Caching strategy and capacity planning
- **Data Integrity**: Comprehensive validation and cascade rules
- **User Experience**: Mobile-first design with consistent error handling

This enhanced plan delivers a robust, scalable care management system that handles real-world complexity while maintaining excellent user experience and data integrity. The foundation is complete, and the remaining work focuses on the most business-critical features: competency assessment workflow and intelligent scheduling system.