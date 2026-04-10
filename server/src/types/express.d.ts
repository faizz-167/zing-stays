import { JwtPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface User extends JwtPayload {}
  }
}
