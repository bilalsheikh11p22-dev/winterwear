import { ZodError } from 'zod';

/**
 * Generic Zod schema validation middleware
 * Validates request body, query, and params against the provided schema.
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign parsed & sanitized values
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;

      next();
   
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: formattedErrors
            .map((err) => err.message)
            .join(', '),
          errors: formattedErrors,
          code: 'VALIDATION_ERROR',
        });
      }

      next(error);
    }

  };
};

export default validate;
