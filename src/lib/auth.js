import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import User from './models/User';

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function createDefaultAdmin() {
  await connectDB();
  
  const adminEmail = 'admin@example.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  
  if (!existingAdmin) {
    const hashedPassword = await hashPassword('SecurePassword123!');
    await User.create({
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    });
    console.log('Default admin created:', adminEmail);
  }
}
