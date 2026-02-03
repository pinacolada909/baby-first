I'll explore the codebase thoroughly to understand all the features and functionality before creating a comprehensive PRD.

Let me also check the translations, authentication system, and database schema to get a complete picture.

Let me also check the CaregiverManager component to understand the caregiver management flow.

I now have a comprehensive understanding of the BabyFirst application. Let me create the PRD for you.

---

# BabyFirst - Product Requirements Document (PRD)

## 1. Executive Summary

**Product Name:** BabyFirst (宝宝第一)

**Tagline:** "Navigate Early Parenthood with Confidence"

**Overview:** BabyFirst is a comprehensive web application designed to help new parents navigate the first 3 months of their newborn's life. The app provides expert guidance, tracking tools for sleep, feeding, and diaper changes, as well as time management features to help multiple caregivers coordinate and ensure adequate rest.

**Target Users:** First-time parents and caregivers of newborns (0-3 months)

**Platform:** Progressive Web Application (React + Vite)

**Languages Supported:** English and Chinese (Simplified)

---

## 2. Product Vision & Goals

### Primary Goals
- Reduce new parent anxiety by providing instant access to expert parenting information
- Enable data-driven insights into baby's patterns (sleep, feeding, diapers)
- Facilitate multi-caregiver coordination to prevent caregiver burnout
- Provide a seamless, bilingual experience for diverse users

### Success Metrics
- User engagement with tracking features
- Multi-caregiver adoption rate
- Q&A usage and satisfaction
- Data synchronization reliability across caregivers

---

## 3. Features Overview

### 3.1 Navigation & Core Structure

| Route | Feature | Icon |
|-------|---------|------|
| `/` | Home | Home |
| `/questions` | Q&A Center | HelpCircle |
| `/sleep-tracker` | Sleep Tracker | Moon |
| `/diaper-tracker` | Diaper Tracker | Baby |
| `/feeding-tracker` | Feeding Tracker | Milk |
| `/time-management` | Time Management | Clock |

### 3.2 Feature Details

#### Home Page
- Hero section with value proposition
- Statistics display (150+ questions, 24/7 tracking, 10h/wk saved)
- Feature cards linking to each major section
- Call-to-action section

#### Q&A Center
**Purpose:** Provide immediate answers to common newborn care questions

**Components:**
- **AI Assistant Chat:** Real-time conversational AI powered by Gemini 2.5 Flash
  - Streaming responses for natural interaction
  - Specialized system prompt for newborn care expertise
  - Message validation (max 50 messages, 4000 chars per message)
  - Authentication required for AI chat

- **FAQ Database:** 18 pre-defined questions across 6 categories:
  - Feeding (3 questions)
  - Sleep (3 questions)
  - Health (3 questions)
  - Development (3 questions)
  - Safety (3 questions)
  - Emotional (3 questions)

- **Search & Filter:** Real-time filtering by category and text search

#### Sleep Tracker
**Purpose:** Log and analyze baby's sleep patterns

**Features:**
- Log sleep sessions with start/end times
- Automatic duration calculation (handles overnight sleep)
- Today's total sleep summary
- Sleep history with delete functionality
- Sleep tips section
- Realtime sync across caregivers (enabled)

**Data Model:**
```text
sleep_sessions
- id (UUID)
- baby_id (FK)
- caregiver_id (FK)
- start_time (timestamp)
- end_time (timestamp)
- duration_hours (float)
- notes (text, nullable)
- created_at (timestamp)
```

#### Diaper Tracker
**Purpose:** Track diaper changes and monitor baby's health patterns

**Features:**
- Log diaper changes with time and status
- Status types: Wet, Dirty, Mixed, Dry
- Today's summary with breakdown by type
- Color-coded status indicators
- Change history with delete functionality

**Data Model:**
```text
diaper_changes
- id (UUID)
- baby_id (FK)
- caregiver_id (FK)
- changed_at (timestamp)
- status (enum: wet/dirty/mixed/dry)
- notes (text, nullable)
- created_at (timestamp)
```

#### Feeding Tracker
**Purpose:** Log feedings and track intake patterns

**Features:**
- Log feedings with time, type, and volume
- Feeding types: Breastmilk, Formula, Ready-to-Feed
- Analytics dashboard with period filters (Day/Week/Month)
- Statistics: Total intake, average per feeding, feeding count
- Visual charts (Bar chart showing formula intake and breastmilk sessions)
- Feeding history with delete functionality

**Data Model:**
```text
feedings
- id (UUID)
- baby_id (FK)
- caregiver_id (FK)
- fed_at (timestamp)
- feeding_type (enum: breastmilk/formula/ready_to_feed)
- volume_ml (integer, nullable)
- duration_minutes (integer, nullable)
- notes (text, nullable)
- created_at (timestamp)
```

#### Time Management
**Purpose:** Coordinate caregiver schedules and ensure adequate rest

**Features:**
- **Caregiver Management:** Add, edit, remove caregivers
- **Time Block Scheduling:** Log care time and rest time
- **Task Assignment:** Assign tasks from predefined types
- **Analytics Dashboard:**
  - Time distribution per caregiver (Bar chart)
  - Overall care vs rest distribution (Pie chart)
  - Task completion by caregiver (Stacked bar chart)
- **Rest Alerts:** Visual warning when caregiver needs rest (< 6 hours)
- Works independently of baby profile selection

**Task Types:**
- Change Diapers
- Feeding
- Cooking
- Cleaning
- Laundry
- Doctor Visit
- Shopping

---

## 4. Multi-Caregiver System

### 4.1 Architecture

**Baby Profiles:**
- Users can create multiple baby profiles
- Each baby has a name and optional birth date
- Baby selector in navigation for switching between profiles

**Caregiver Roles:**
- **Primary:** Full access, can invite others
- **Member:** Standard access, cannot invite

**Invite System:**
- Primary caregiver generates 6-character invite code
- Codes use secure character set (excludes confusing chars: 0, O, I, 1)
- Codes expire after 7 days
- New caregiver provides display name when joining

### 4.2 Data Access

**Row Level Security (RLS):**
- All tracker tables protected with RLS
- Helper functions for access validation:
  - `is_baby_caregiver(_baby_id, _user_id)`: Boolean check
  - `is_primary_caregiver(_baby_id, _user_id)`: Primary role check
  - `shares_baby_with(_profile_user_id, _viewer_id)`: Profile visibility

**Database Tables:**
```text
babies
baby_caregivers (junction table with roles)
baby_invites (invite codes with expiry)
profiles (user display names)
sleep_sessions
diaper_changes
feedings
```

---

## 5. Authentication

### 5.1 Authentication Flow
- Email/password authentication
- Sign up requires display name
- Sign in with email/password
- Session management via Supabase Auth
- Auth modal accessible from navigation

### 5.2 Demo Mode
- Unauthenticated users can use trackers locally
- Data stored in component state (not persisted)
- Visual indicator showing "Demo mode - data will not be saved"
- Login prompt on each tracker page

---

## 6. Technical Architecture

### 6.1 Frontend Stack
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with custom theme
- **UI Components:** Radix UI primitives (shadcn/ui)
- **State Management:** React Context + TanStack Query
- **Charts:** Recharts
- **Routing:** React Router DOM v6

### 6.2 Backend (Lovable Cloud)
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth
- **Edge Functions:** Deno runtime
- **Realtime:** Supabase Realtime (enabled for sleep_sessions)

### 6.3 AI Integration
- **Provider:** Lovable AI Gateway
- **Model:** google/gemini-2.5-flash
- **Edge Function:** `parenting-chat`
- **Features:** Streaming responses, CORS validation, rate limiting

---

## 7. Internationalization (i18n)

### Supported Languages
- English (default)
- Chinese Simplified (中文)

### Implementation
- Language context provider
- Centralized translation file (`src/translations/index.ts`)
- Language selector in navigation
- All user-facing text translated

### Coverage
- Navigation labels
- Page titles and subtitles
- Form labels and placeholders
- Error and success messages
- Tips and informational content
- Q&A content (18 questions in each language)

---

## 8. User Experience

### 8.1 Design System
- Gradient backgrounds (purple, green, accent)
- Rounded corners (xl for cards, full for pills)
- Soft shadows
- Color-coded status indicators
- Responsive design (mobile-first)

### 8.2 Navigation
- Fixed top navigation bar
- Desktop: Full labels with icons
- Mobile: Icons only
- Active state highlighting
- Baby selector (when multiple babies)
- Language selector
- User menu (authenticated)

### 8.3 Feedback
- Toast notifications for actions
- Loading states
- Empty states with helpful messaging
- Real-time updates across devices

---

## 9. Security Considerations

### Implemented
- Row Level Security on all data tables
- JWT validation on edge functions
- CORS origin validation (*.lovable.app + custom)
- Input validation (message length, format)
- Rate limiting on AI endpoint
- Secure invite code generation (Web Crypto API)

### Data Privacy
- User data isolated by caregiver relationships
- No cross-user data access
- Secure session handling

---

## 10. Future Considerations

### Potential Enhancements
1. **Data Persistence for Time Management:** Persist time blocks and tasks to database
2. **Realtime for All Trackers:** Enable realtime sync for diaper and feeding trackers
3. **Growth Charts:** Track and visualize baby's growth metrics
4. **Export Data:** Allow parents to export tracking data (PDF/CSV)
5. **Push Notifications:** Reminders for feedings, medications
6. **Medical Appointment Tracker:** Log doctor visits and vaccinations
7. **Photo Journal:** Capture and organize milestone photos
8. **Sleep Analytics:** Weekly/monthly trend analysis
9. **Offline Support:** PWA with service worker caching
10. **Dark Mode:** Theme toggle support

---

## 11. Current Status Summary

| Feature | Status | Data Persistence | Realtime |
|---------|--------|------------------|----------|
| Authentication | Complete | Yes | N/A |
| Multi-Caregiver | Complete | Yes | N/A |
| Baby Profiles | Complete | Yes | N/A |
| Q&A / AI Chat | Complete | No | No |
| Sleep Tracker | Complete | Yes | Yes |
| Diaper Tracker | Complete | Yes | No |
| Feeding Tracker | Complete | Yes | No |
| Time Management | Complete | No (local only) | No |

---
