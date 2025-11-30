# 🔍 API Route Explanation - Review Submission System

## What is an API Route?

An **API route** is a server-side endpoint that handles requests from your website. Think of it as a "back door" that processes data and saves it to your database.

## The Review Submission API Route

### Location
**File:** `app/api/reviews/submit/route.ts`  
**URL:** `http://localhost:3000/api/reviews/submit`

### What It Does

When a user submits a review on your "Our Work" page, here's what happens:

```
┌─────────────────┐
│  User fills     │
│  review form    │
│  and clicks     │
│  "Submit"       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  JavaScript (browser)       │
│  - Collects form data       │
│  - Sends POST request       │
│  to: /api/reviews/submit    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  API Route                  │
│  (app/api/reviews/          │
│   submit/route.ts)          │
│  - Receives the data        │
│  - Validates it             │
│  - Saves to database        │
│  - Returns success/error    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Supabase Database          │
│  - Stores the review        │
│  in "client_reviews" table  │
└─────────────────────────────┘
```

## Step-by-Step Breakdown

### 1. **User Submits Review** (Frontend)
**File:** `public/our-work.html` (lines 1144-1150)

```javascript
// User fills the form and clicks submit
const apiUrl = window.location.origin + '/api/reviews/submit';
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_name: "John Doe",
    client_company: "ABC Corp",
    project_category: "Voting Systems",
    rating: 5,
    review_text: "Great work!"
  })
});
```

**This sends a POST request to:** `http://localhost:3000/api/reviews/submit`

---

### 2. **API Route Receives Request** (Backend)
**File:** `app/api/reviews/submit/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. Extract data from request
  const body = await request.json()
  const { client_name, client_company, project_category, rating, review_text } = body
  
  // 2. Validate the data
  if (!client_name || !project_category || !rating || !review_text) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
  }
  
  // 3. Save to database
  const review = await db.submitReview({ client_name, client_company, project_category, rating, review_text })
  
  // 4. Return success response
  return NextResponse.json({ success: true, review })
}
```

---

### 3. **Database Operation** (Supabase)
**File:** `lib/supabaseClient.ts`

```typescript
async submitReview(reviewData) {
  const { data, error } = await supabase
    .from('client_reviews')
    .insert({
      client_name: reviewData.client_name,
      client_company: reviewData.client_company,
      project_category: reviewData.project_category,
      rating: reviewData.rating,
      review_text: reviewData.review_text,
      status: 'approved',
      approved_at: new Date().toISOString()
    })
  
  return data
}
```

---

## Why You Need Next.js Server Running

The API route **only works when your Next.js server is running** because:

1. ✅ The route file (`route.ts`) is a **server-side** file
2. ✅ It needs to run on Node.js to access the database
3. ✅ It processes requests that come from your browser

### Without Server Running:
```
Browser → ❌ Cannot connect → "TypeError: fetch failed"
```

### With Server Running:
```
Browser → ✅ Connects → API Route → Database → ✅ Success
```

---

## All Review API Routes

Your project has **3 review-related API routes**:

### 1. Submit Review
- **URL:** `/api/reviews/submit`
- **Method:** `POST`
- **Purpose:** Save a new review to database
- **File:** `app/api/reviews/submit/route.ts`

### 2. Get Reviews
- **URL:** `/api/reviews/get`
- **Method:** `GET`
- **Purpose:** Retrieve all approved reviews
- **File:** `app/api/reviews/get/route.ts`

### 3. Check Table
- **URL:** `/api/reviews/check-table`
- **Method:** `GET`
- **Purpose:** Verify database table exists (diagnostic)
- **File:** `app/api/reviews/check-table/route.ts`

---

## File Structure

```
Prelyct.com/
├── app/
│   └── api/
│       └── reviews/
│           ├── submit/
│           │   └── route.ts    ← Handles POST requests (save reviews)
│           ├── get/
│           │   └── route.ts    ← Handles GET requests (load reviews)
│           └── check-table/
│               └── route.ts    ← Diagnostic endpoint
├── public/
│   └── our-work.html           ← Frontend form (calls /api/reviews/submit)
└── lib/
    └── supabaseClient.ts       ← Database functions
```

---

## Common Questions

### Q: Why can't I just save to database directly from the browser?
**A:** For security! You should never expose database credentials to the browser. API routes keep your database safe.

### Q: What happens if the server isn't running?
**A:** The browser can't reach the API route, so you get "TypeError: fetch failed".

### Q: How do I start the server?
**A:** Run `npm run dev` in your terminal. Wait for "Ready - started server on 0.0.0.0:3000".

### Q: Can I test the API route directly?
**A:** Yes! Use:
- **Browser:** Visit `http://localhost:3000/api/reviews/check-table`
- **Postman/curl:** Send POST request to `http://localhost:3000/api/reviews/submit`

---

## Summary

The **API route** (`/api/reviews/submit`) is the **bridge** between:
- 🌐 Your website (frontend)
- 💾 Your database (backend)

It's like a waiter taking your order (form data) and bringing it to the kitchen (database), then bringing back confirmation (success/error response).

**Without the server running, the waiter (API route) isn't available, so your order (review) can't be processed!**


