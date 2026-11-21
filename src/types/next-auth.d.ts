import { UserRole } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: UserRole;
    vendorId: string | null;
    isPlatformAdmin: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      vendorId: string | null;
      isPlatformAdmin: boolean;
    };
  }
}
