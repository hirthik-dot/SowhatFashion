import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation Error', error: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  if ((err as any).code === 11000) {
    return res.status(409).json({ message: 'Duplicate entry. This record already exists.' });
  }

  res.status(500).json({ message: 'Internal server error', error: err.message });
};

export default errorHandler;
