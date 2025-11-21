#!/usr/bin/env node

/**
 * Supabase Setup Script
 * This script helps automate the Supabase setup process
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('\n🚀 Prelyct Votes - Supabase Setup\n')
  console.log('This script will help you set up Supabase for your project.\n')

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local')
  const envExamplePath = path.join(process.cwd(), '.env.example')
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. We\'ll update it with your Supabase credentials.\n')
  }

  console.log('📋 Step 1: Create Supabase Project')
  console.log('   1. Go to https://supabase.com and sign in (or create an account)')
  console.log('   2. Click "New Project"')
  console.log('   3. Fill in project details:')
  console.log('      - Name: prelyct-votes (or your preferred name)')
  console.log('      - Database Password: Choose a strong password (save it!)')
  console.log('      - Region: Choose closest to your users')
  console.log('   4. Click "Create new project" and wait for it to initialize\n')

  const continueSetup = await question('Have you created your Supabase project? (yes/no): ')
  
  if (continueSetup.toLowerCase() !== 'yes') {
    console.log('\n⏸️  Please create your Supabase project first, then run this script again.')
    rl.close()
    return
  }

  console.log('\n📋 Step 2: Get Your API Keys')
  console.log('   1. In your Supabase project dashboard, go to Settings → API')
  console.log('   2. Copy the following values:\n')

  const supabaseUrl = await question('   Enter your Project URL: ')
  const supabaseAnonKey = await question('   Enter your anon public key: ')

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Error: Both URL and key are required.')
    rl.close()
    return
  }

  // Create .env.local
  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}

# Payment Provider (Optional - for future integration)
# STRIPE_SECRET_KEY=your_stripe_secret_key
# STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
# PAYSTACK_SECRET_KEY=your_paystack_secret_key
# PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Webhook Secret (for payment webhooks)
# WEBHOOK_SECRET=your_webhook_secret
`

  fs.writeFileSync(envPath, envContent)
  console.log('\n✅ Created .env.local with your Supabase credentials')

  console.log('\n📋 Step 3: Run Database Migration')
  console.log('   1. In your Supabase project dashboard, go to SQL Editor')
  console.log('   2. Click "New Query"')
  console.log('   3. Open the file: supabase/migrations/001_initial_schema.sql')
  console.log('   4. Copy the entire contents and paste into the SQL Editor')
  console.log('   5. Click "Run" (or press Ctrl+Enter)')
  console.log('   6. Verify the migration succeeded (you should see "Success. No rows returned")\n')

  const migrationDone = await question('Have you run the database migration? (yes/no): ')

  if (migrationDone.toLowerCase() !== 'yes') {
    console.log('\n⏸️  Please run the migration in Supabase SQL Editor, then verify your setup.')
    console.log('   You can test by creating an election at /dashboard/votes/new')
    rl.close()
    return
  }

  console.log('\n✅ Setup Complete!')
  console.log('\n📝 Next Steps:')
  console.log('   1. Start your development server: npm run dev')
  console.log('   2. Navigate to /dashboard/votes/new and create an election')
  console.log('   3. Check your Supabase dashboard → Table Editor → elections')
  console.log('   4. Verify the election and invoice were created\n')

  rl.close()
}

main().catch(console.error)




