# Plan: Update UI, Fix Bugs, and Add Analytics Dashboard

This plan addresses all your requested UI updates, bug fixes, and the massive addition of the new Analytics Dashboard graphs.

## User Review Required
> [!IMPORTANT]
> Adding 8 new complex charts to the `Results.tsx` dashboard is a significant UI change. Please review the proposed approach below. 
> Also, please confirm if 50 items per page is the default limit for the audit logs (I will disable the "Next" button if fewer than 50 items are returned).

## Open Questions
- Is there any specific error message you see when "projects not working properly"? I will thoroughly test the projects API, but if you have a screenshot of the error, that would help.

## Proposed Changes

### 1. Minor UI Fixes
#### [MODIFY] `src/pages/UserManagement.tsx`
- Remove the hardcoded `(admin1/admin2@impactstudio.com)` text from the role descriptions.
- Remove all references to the `department` field in the user creation form and table.

#### [MODIFY] `src/pages/Profile.tsx`
- Remove the `Department` input field completely from the profile page.

#### [MODIFY] `src/pages/AuditLogs.tsx`
- Update the pagination logic so the "Next" button is disabled when `logs.length < 50` (or whatever the backend limit is) or when `page * 50 >= total`. This prevents users from clicking "Next" into an empty page.

### 2. Sample Data (Indian Project)
#### [MODIFY] `backend/app/database.py`
- I will add a new Project Manager named "Rahul Sharma" and a Client named "Priya Patel".
- I will create a detailed sample project named "UPI Gateway Integration" with multiple change requests to fully populate the charts.

### 3. Analytics Dashboard / Graphs
#### [MODIFY] `src/pages/Results.tsx` (or a new `Analytics.tsx` component)
I will build out the complete suite of charts you requested using `Recharts`:
1. **Cost Trend Over Time (LineChart)**
2. **Risk Trend Over Sprints (LineChart)**
3. **Team Effort Distribution (PieChart)**
4. **Timeline vs Actual Burndown (LineChart/ComposedChart)**
5. **Project Health Dashboard (Progress Bars)**
6. **Change Request Volume (BarChart)**
7. **Cost vs Benefit Analysis (ScatterChart)**
8. **Approval Status Dashboard (BarChart/Progress)**

## Verification Plan
1. I will run `npm run dev` and `python run.py` locally.
2. I will log in as the newly created Indian PM to verify the new project loads correctly.
3. I will test creating a new project from the UI to debug the "projects not working" issue.
4. I will verify the Audit Logs "Next" button disables correctly.
