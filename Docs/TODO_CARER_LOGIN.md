# TODO: Carer Login Page

## Task
Create a separate login page specifically for carers at `/carer-login` route.

## Current State
- All users (admins and carers) currently use the same login page at `/login`
- Email verification redirects carers to `/login` (same as admins)

## Required Changes
1. **Create new CarerLoginPage component**
   - Location: `client/src/pages/CarerLoginPage.tsx`
   - Should have carer-specific branding/messaging
   - Same authentication logic but potentially different UI/UX

2. **Update App.tsx routing**
   - Add route: `<Route path="/carer-login" element={<CarerLoginPage />} />`

3. **Update EmailChangeVerification.tsx**
   - Change line 62 from `/login` to `/carer-login` for carers
   - File: `client/src/pages/EmailChangeVerification.tsx`

4. **Update other redirects as needed**
   - Check for any other places that should redirect carers to carer login
   - Invitation acceptance flows
   - Password reset flows

## Files to Update
- `client/src/pages/CarerLoginPage.tsx` (create new)
- `client/src/App.tsx` (add route)
- `client/src/pages/EmailChangeVerification.tsx` (update redirect)

## Priority
Medium - Current workaround is functional but not ideal UX