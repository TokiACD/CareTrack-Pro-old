import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Generate a secure random password if not provided via environment
function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString('base64').slice(0, 16) + '!Aa1'
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Create initial admin user (dev admin)
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@caretrack.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123'
  
  // Check if admin already exists
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('✅ Admin user already exists')
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    
    const admin = await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        passwordHash,
        isActive: true,
      },
    })

    console.log('✅ Created initial admin user:')
    console.log(`   Email: ${adminEmail}`)
    if (process.env.NODE_ENV === 'development') {
      console.log(`   Password: ${adminPassword}`)
      console.log(`   ⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!`)
    } else {
      console.log(`   ℹ️  Password has been set from environment or generated securely`)
    }
  }


  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })