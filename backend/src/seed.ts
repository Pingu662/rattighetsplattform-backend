import prisma from './config/prisma';
import logger from './config/logger';

const roles = [
  {
    id: 1,
    name: 'super_admin',
    description: 'Full system access',
    permissions: JSON.stringify(['all']),
  },
  {
    id: 2,
    name: 'admin',
    description: 'Administrative access',
    permissions: JSON.stringify([
      'manage_users',
      'manage_cases',
      'manage_documents',
      'manage_ai',
      'moderate_forum',
      'view_stats',
    ]),
  },
  {
    id: 3,
    name: 'jurist',
    description: 'Verified legal professional',
    permissions: JSON.stringify([
      'create_forum',
      'answer_questions',
      'access_library',
      'upload_cases',
    ]),
  },
  {
    id: 4,
    name: 'moderator',
    description: 'Forum and content moderation',
    permissions: JSON.stringify([
      'moderate_forum',
      'manage_categories',
      'hide_content',
    ]),
  },
  {
    id: 5,
    name: 'expert',
    description: 'Subject matter expert',
    permissions: JSON.stringify([
      'create_forum',
      'access_library',
      'upload_cases',
      'comment_cases',
    ]),
  },
  {
    id: 6,
    name: 'user',
    description: 'Standard user',
    permissions: JSON.stringify([
      'view_cases',
      'create_appeals',
      'upload_documents',
      'use_ai',
      'forum_participate',
    ]),
  },
];

async function main() {
  logger.info('Starting database seed...');

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
        permissions: JSON.parse(role.permissions),
      },
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: JSON.parse(role.permissions),
      },
    });
    logger.info(`  ✅ Role '${role.name}' (id=${role.id}) seeded`);
  }

  // Verify roles
  const roleCount = await prisma.role.count();
  logger.info(`Database seed complete. ${roleCount} roles in database.`);
  console.log(`\n✅ Seed complete: ${roleCount} roles seeded successfully\n`);
}

main()
  .catch((e) => {
    logger.error('Seed failed:', e);
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
