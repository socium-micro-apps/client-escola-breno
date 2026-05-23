// Extensão dos tipos do Express para anexar o admin autenticado em req.user.

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export {};
