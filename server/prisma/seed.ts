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
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || generateSecurePassword()
  
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
        phone: '+44 1234 567890',
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

  // Create package-task assignments for proper competency validation
  console.log('🔗 Creating package-task assignments...')

  // Get all packages and tasks for assignment
  const allPackages = await prisma.carePackage.findMany()
  const allTasks = await prisma.task.findMany()

  // Create meaningful task assignments for each package
  const packageTaskAssignments = [
    // Sunrise Manor - Full service care home (most tasks)
    { packageName: 'Sunrise Manor', taskNames: ['Personal Care', 'Medication Administration', 'Documentation'] },
    // Oakwood Care - Community care (practical tasks)  
    { packageName: 'Oakwood Care', taskNames: ['Personal Care', 'Mobility Assistance', 'Meal Preparation'] },
    // Garden View - Basic care services (essential tasks)
    { packageName: 'Garden View', taskNames: ['Personal Care', 'Documentation'] },
  ]

  for (const assignment of packageTaskAssignments) {
    const carePackage = allPackages.find(p => p.name === assignment.packageName)
    if (!carePackage) {
      console.log(`⚠️  Package not found: ${assignment.packageName}`)
      continue
    }

    for (const taskName of assignment.taskNames) {
      const task = allTasks.find(t => t.name === taskName)
      if (!task) {
        console.log(`⚠️  Task not found: ${taskName}`)
        continue
      }

      // Check if assignment already exists
      const existingAssignment = await prisma.packageTaskAssignment.findUnique({
        where: {
          packageId_taskId: {
            packageId: carePackage.id,
            taskId: task.id
          }
        }
      })

      if (!existingAssignment) {
        await prisma.packageTaskAssignment.create({
          data: {
            packageId: carePackage.id,
            taskId: task.id,
            isActive: true
          }
        })
        console.log(`✅ Assigned task "${task.name}" to "${carePackage.name}"`)
      }
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