const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function updatePassword() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.update({
      where: { id: 1 },
      data: { password: hashedPassword }
    });
    console.log('✅ Contraseña actualizada para:', user.username);
    console.log('🔑 Nueva contraseña: admin123');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
