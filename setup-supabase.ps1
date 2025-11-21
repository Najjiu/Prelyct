# Supabase Setup Script for Windows
# This script helps automate the Supabase setup process

Write-Host "`n🚀 Prelyct Votes - Supabase Setup`n" -ForegroundColor Cyan
Write-Host "This script will help you set up Supabase for your project.`n" -ForegroundColor Gray

# Check if .env.local exists
$envPath = ".env.local"
$migrationPath = "supabase\migrations\001_initial_schema.sql"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env.local already exists. We'll update it with your Supabase credentials.`n" -ForegroundColor Yellow
}

Write-Host "📋 Step 1: Create Supabase Project" -ForegroundColor Green
Write-Host "   1. Go to https://supabase.com and sign in" -ForegroundColor Gray
Write-Host "   2. Click New Project" -ForegroundColor Gray
Write-Host "   3. Fill in project details:" -ForegroundColor Gray
Write-Host "      - Name: prelyct-votes" -ForegroundColor Gray
Write-Host "      - Database Password: Choose a strong password" -ForegroundColor Gray
Write-Host "      - Region: Choose closest to your users" -ForegroundColor Gray
Write-Host "   4. Click Create new project and wait`n" -ForegroundColor Gray

$continue = Read-Host "Have you created your Supabase project? (yes/no)"

if ($continue -ne "yes") {
    Write-Host "`n⏸️  Please create your Supabase project first, then run this script again." -ForegroundColor Yellow
    exit
}

Write-Host "`n📋 Step 2: Get Your API Keys" -ForegroundColor Green
Write-Host "   1. In your Supabase dashboard, go to Settings then API" -ForegroundColor Gray
Write-Host "   2. Copy the following values:" -ForegroundColor Gray
Write-Host "" -ForegroundColor Gray

$supabaseUrl = Read-Host "   Enter your Project URL"
$supabaseAnonKey = Read-Host "   Enter your anon public key"

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($supabaseAnonKey)) {
    Write-Host "`n❌ Error: Both URL and key are required." -ForegroundColor Red
    exit
}

# Create .env.local
$envContent = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnonKey

# Payment Provider (Optional - for future integration)
# STRIPE_SECRET_KEY=your_stripe_secret_key
# STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
# PAYSTACK_SECRET_KEY=your_paystack_secret_key
# PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Webhook Secret (for payment webhooks)
# WEBHOOK_SECRET=your_webhook_secret
"@

Set-Content -Path $envPath -Value $envContent
Write-Host "`n✅ Created .env.local with your Supabase credentials" -ForegroundColor Green

Write-Host "`n📋 Step 3: Run Database Migration" -ForegroundColor Green
Write-Host "   1. In your Supabase dashboard, go to SQL Editor" -ForegroundColor Gray
Write-Host "   2. Click New Query" -ForegroundColor Gray

if (Test-Path $migrationPath) {
    Write-Host "   3. The migration file is at: $migrationPath" -ForegroundColor Gray
    Write-Host "   4. Open the file and copy its contents" -ForegroundColor Gray
    Write-Host "   5. Paste into the SQL Editor in Supabase" -ForegroundColor Gray
    Write-Host "   6. Click Run or press Ctrl+Enter" -ForegroundColor Gray
    Write-Host "   7. Verify success: Should see Success message`n" -ForegroundColor Gray
    
    # Try to open the migration file
    $openFile = Read-Host "   Would you like to open the migration file? (yes/no)"
    if ($openFile -eq "yes") {
        Start-Process notepad.exe $migrationPath
    }
} else {
    Write-Host "   3. Open the file: supabase/migrations/001_initial_schema.sql" -ForegroundColor Gray
    Write-Host "   4. Copy the entire contents and paste into the SQL Editor" -ForegroundColor Gray
    Write-Host "   5. Click 'Run' (or press Ctrl+Enter)" -ForegroundColor Gray
    Write-Host "   6. Verify the migration succeeded`n" -ForegroundColor Gray
}

$migrationDone = Read-Host "Have you run the database migration? (yes/no)"

if ($migrationDone -ne "yes") {
    Write-Host "`n⏸️  Please run the migration in Supabase SQL Editor, then verify your setup." -ForegroundColor Yellow
    Write-Host "   You can test by creating an election at /dashboard/votes/new`n" -ForegroundColor Gray
    exit
}

Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start your development server: npm run dev" -ForegroundColor Gray
Write-Host "   2. Navigate to /dashboard/votes/new and create an election" -ForegroundColor Gray
Write-Host "   3. Check your Supabase dashboard → Table Editor → elections" -ForegroundColor Gray
Write-Host "   4. Verify the election and invoice were created`n" -ForegroundColor Gray

Write-Host "🎉 You're all set! Happy coding!`n" -ForegroundColor Green

