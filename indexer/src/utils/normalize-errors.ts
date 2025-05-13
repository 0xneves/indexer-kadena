/**
 * Error formatting and normalization for the GraphQL API
 *
 * This file provides utilities for standardizing and enriching error responses
 * in the GraphQL API. It handles specific types of errors (like validation errors)
 * and formats them in a consistent, client-friendly way with additional context
 * to help with debugging and error handling on the client side.
 */

import { GraphQLFormattedError } from 'graphql';
import { ZodError } from 'zod';
import { unwrapResolverError } from '@apollo/server/errors';

/**
 * Extended error interface for GraphQL responses with additional contextual fields
 *
 * This interface adds fields beyond the standard GraphQL error format:
 * - type: Classification of the error (e.g., "ZodError", "ConnectionError")
 * - description: Human-readable explanation of what went wrong
 * - data: Additional structured data related to the error
 */
interface CustomFormattedError extends GraphQLFormattedError {
  type?: string;
  description?: string;
  data?: any;
}

/**
 * Formats GraphQL errors into a standardized, detailed format for clients
 *
 * This function enhances GraphQL error responses by:
 * 1. Identifying specific error types (like Zod validation errors)
 * 2. Adding human-readable descriptions of what went wrong
 * 3. Including additional contextual data to help debug the issue
 * 4. Standardizing the error format across different error sources
 *
 * It handles special cases like:
 * - Zod validation errors: Converting validation issues into structured fields
 * - Connection errors: Providing clearer messages when the blockchain node is unreachable
 *
 * @param formattedError - The original GraphQL formatted error
 * @param error - The raw error object that caused the problem
 * @returns An enhanced error object with additional context
 */
export const formatError = (
  formattedError: GraphQLFormattedError,
  error: unknown,
): CustomFormattedError => {
  const unwrappedError = unwrapResolverError(error);

  if (unwrappedError instanceof ZodError) {
    if (unwrappedError.issues.length > 0) {
      return {
        message: 'Input Validation Error',
        type: 'ZodError',
        description: 'The input provided is invalid. Check the input and try again.',
        data: unwrappedError.issues.map(issue => ({
          message: issue.message,
          path: issue.path.join('.'),
        })),
      };
    }
  }

  if (
    error instanceof Error &&
    'code' in error &&
    'type' in error &&
    (error as any).code === 'ECONNREFUSED'
  ) {
    return {
      message: 'Chainweb Node Connection Refused',
      type: (error as any).type,
      description:
        'Chainweb Node connection refused. Are you sure the Chainweb Node is running and reachable?',
      data: error.stack ?? [],
    };
  }

  return formattedError;
};
