import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create initial admin user (dev admin)
  const adminEmail = 'admin@caretrack.com'
  const adminPassword = 'admin123' // Change this in production!
  
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
    console.log(`   Password: ${adminPassword}`)
    console.log(`   ⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!`)
  }

  // Create sample care packages
  const packages = [
    { name: 'Sunrise Manor', postcode: '123' },
    { name: 'Oakwood Care', postcode: '456' },
    { name: 'Garden View', postcode: '789' },
  ]

  for (const pkg of packages) {
    const existing = await prisma.carePackage.findFirst({
      where: { name: pkg.name },
    })

    if (!existing) {
      await prisma.carePackage.create({
        data: pkg,
      })
      console.log(`✅ Created care package: ${pkg.name}`)
    }
  }

  // Create sample tasks
  const tasks = [
    { name: 'Personal Care', targetCount: 50 },
    { name: 'Medication Administration', targetCount: 30 },
    { name: 'Mobility Assistance', targetCount: 40 },
    { name: 'Meal Preparation', targetCount: 25 },
    { name: 'Documentation', targetCount: 20 },
  ]

  for (const task of tasks) {
    const existing = await prisma.task.findFirst({
      where: { name: task.name },
    })

    if (!existing) {
      await prisma.task.create({
        data: task,
      })
      console.log(`✅ Created task: ${task.name}`)
    }
  }

  // Create sample carers
  const carers = [
    { email: 'sarah.jones@email.com', name: 'Sarah Jones', phone: '07123456789' },
    { email: 'mike.smith@email.com', name: 'Mike Smith', phone: '07234567890' },
    { email: 'emma.brown@email.com', name: 'Emma Brown', phone: '07345678901' },
  ]

  for (const carer of carers) {
    const existing = await prisma.carer.findUnique({
      where: { email: carer.email },
    })

    if (!existing) {
      await prisma.carer.create({
        data: carer,
      })
      console.log(`✅ Created carer: ${carer.name}`)
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