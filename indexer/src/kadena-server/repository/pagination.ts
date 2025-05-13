/**
 * Pagination utilities implementing the Relay Connection specification
 *
 * This file provides utility functions and types for implementing cursor-based pagination
 * following the Relay Connection specification for GraphQL. It handles cursor encoding/decoding,
 * page information calculation, and pagination parameter processing.
 *
 * The implementation supports both forward pagination (using 'first' and 'after') and
 * backward pagination (using 'last' and 'before'), allowing clients to navigate through
 * large result sets efficiently in both directions.
 */

import { InputMaybe, PageInfo } from '../config/graphql-types';
import { ConnectionEdge } from './types';

/**
 * Standard pagination parameters interface following the Relay specification
 *
 * @property after - Optional cursor to fetch items after this position
 * @property before - Optional cursor to fetch items before this position
 * @property first - Optional number of items to fetch (forward pagination)
 * @property last - Optional number of items to fetch (backward pagination)
 */
export interface PaginationsParams {
  after?: InputMaybe<string>;
  before?: InputMaybe<string>;
  first?: InputMaybe<number>;
  last?: InputMaybe<number>;
}

/**
 * Default number of items to return if no limit is specified
 */
const DEFAULT_LIMIT = 20;

/**
 * Extra item to fetch to determine if there are more pages
 */
const LIMIT_NEXT_PAGE_CHECK = 1;

/**
 * Internal interface for page information calculation parameters
 *
 * @template T - The type of data node contained in the edges
 * @property order - Sort order (ascending or descending)
 * @property limit - Maximum number of items to return
 * @property edges - The edges to process
 * @property after - Optional cursor for items after this position
 * @property before - Optional cursor for items before this position
 */
interface Params<T> {
  order: 'ASC' | 'DESC';
  limit: number;
  edges: ConnectionEdge<T>[];
  after?: string | null;
  before?: string | null;
}

/**
 * Encodes a cursor to base64 for transmission to clients
 *
 * This function converts a string cursor (typically a database ID or timestamp)
 * into a base64-encoded string. This provides several benefits:
 * 1. Obscures implementation details from clients
 * 2. Makes cursors URL-safe for transmission
 * 3. Creates a standardized format regardless of the internal cursor implementation
 * 4. Prevents clients from easily guessing or manipulating cursor values
 *
 * @param cursor - The raw cursor string to encode
 * @returns The base64-encoded cursor string
 */
export const encodeCursor = (cursor: string): string => Buffer.from(cursor).toString('base64');

/**
 * Decodes a base64-encoded cursor from a client request
 *
 * This function converts a base64-encoded cursor string back to its original form.
 * When paginating through database results, this decoded cursor is used to:
 * 1. Create database queries that find records after/before this cursor
 * 2. Build WHERE clauses with appropriate comparison operators
 * 3. Match against appropriate fields (IDs, timestamps, etc.) in the database
 *
 * @param cursor - The base64-encoded cursor string
 * @returns The decoded raw cursor string
 */
export const decodeCursor = (cursor: string): string =>
  Buffer.from(cursor, 'base64').toString('utf8');

/**
 * Calculates page information and processes edges for a paginated result
 *
 * This function implements the core logic for determining pagination metadata:
 * - Whether there are previous/next pages available
 * - The start and end cursors for the current page
 * - Processing the edges to include only those needed for the current page
 *
 * It handles both forward and backward pagination, returning properly structured
 * page information and encoded cursors following the Relay specification.
 *
 * @template T - The type of data node contained in the edges
 * @param params - Pagination parameters and edges to process
 * @returns Object containing page information and processed edges
 */
export const getPageInfo = <T>({
  order = 'DESC',
  limit: limitParam,
  edges,
  after,
  before,
}: Params<T>): { pageInfo: PageInfo; edges: ConnectionEdge<T>[] } => {
  // Get the total number of edges we received from the data source
  const length = edges.length;

  // Calculate the actual limit to show to the client by subtracting the extra item
  // that was fetched to determine if there are more pages
  const limit = (limitParam ?? DEFAULT_LIMIT) - LIMIT_NEXT_PAGE_CHECK;

  // Empty case: No results found - return empty page info
  if (length === 0) {
    return {
      pageInfo: {
        startCursor: null,
        endCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      edges,
    };
  }

  let hasNextPage = false;
  let hasPreviousPage = false;
  let startCursor = null;
  let endCursor = null;
  let newEdges = null;

  // Calculate how many items to include in the result
  // (minimum of the available items and the requested limit)
  const idx = Math.min(length, limit);

  if (order === 'DESC') {
    // For descending order (newest first, typical "forward" pagination)

    // If we got more items than the limit, there are more items available
    hasNextPage = length > limit;

    // If we used an 'after' cursor, there must be previous pages
    hasPreviousPage = !!after;

    // The start cursor is from the first item (newest)
    startCursor = encodeCursor(edges[0].cursor);

    // The end cursor is from the last item we're returning to the client
    endCursor = encodeCursor(edges[idx - 1].cursor);

    // Take only the items up to our calculated limit
    newEdges = edges.slice(0, idx);
  } else {
    // For ascending order (oldest first, typically used for backward pagination)

    // If 'before' was specified, there might be newer items
    hasNextPage = !!before;

    // If we got more items than requested, there must be older items
    hasPreviousPage = length > limit;

    // For ASC order, we reverse the results to maintain chronological ordering
    // and take only up to our limit
    const reversed = edges.slice(0, idx).reverse();

    // After reversing, the start cursor is now the first item
    startCursor = encodeCursor(reversed[0].cursor);

    // And the end cursor is the last item
    endCursor = encodeCursor(reversed[reversed.length - 1].cursor);

    // Use the reversed array as our new edges
    newEdges = [...reversed];
  }

  // Encode all cursors in the edges list before returning to the client
  // This ensures the cursors are consistently base64-encoded
  const edgesWithCursorEncoded = newEdges.map(e => ({
    cursor: encodeCursor(e.cursor),
    node: e.node,
  }));

  // Construct the final PageInfo object
  const pageInfo = {
    startCursor,
    endCursor,
    hasNextPage,
    hasPreviousPage,
  };

  // Return both the page info and the processed edges
  return { pageInfo, edges: edgesWithCursorEncoded };
};

/**
 * Input parameters for pagination as provided by GraphQL queries
 */
type PaginationInput = {
  after?: InputMaybe<string>;
  before?: InputMaybe<string>;
  first?: InputMaybe<number>;
  last?: InputMaybe<number>;
};

/**
 * Processed pagination parameters used by repository implementations
 */
type PaginationOutput = {
  limit: number;
  order: 'ASC' | 'DESC';
  after: string | null;
  before: string | null;
};

/**
 * Processes pagination input parameters into a standardized format for repositories
 *
 * This function converts the GraphQL pagination arguments into concrete parameters
 * that repositories can use for database queries:
 * - Determines the appropriate limit including the extra item for page detection
 * - Sets the correct sort order based on pagination direction
 * - Decodes cursors if provided
 * - Applies default values when parameters are missing
 *
 * @param pagination - The pagination input from a GraphQL query
 * @returns Processed pagination parameters for repository use
 */
export function getPaginationParams({
  after,
  before,
  first,
  last,
}: PaginationInput): PaginationOutput {
  // Case 1: Forward pagination with an after cursor
  if (after) {
    return {
      // Calculate limit, including an extra item to check for more pages
      limit: (first ?? DEFAULT_LIMIT) + LIMIT_NEXT_PAGE_CHECK,
      // For "after" cursor pagination, we want newest items first
      order: 'DESC',
      // Decode the cursor for database comparison
      after: decodeCursor(after),
      // No before cursor needed in this case
      before: null,
    };
  }

  // Case 2: Backward pagination with a before cursor
  if (before) {
    return {
      // Calculate limit, including an extra item to check for more pages
      limit: (last ?? DEFAULT_LIMIT) + LIMIT_NEXT_PAGE_CHECK,
      // For "before" cursor pagination, we want oldest items first
      // This will be reversed later by getPageInfo
      order: 'ASC',
      // No after cursor needed in this case
      after: null,
      // Decode the cursor for database comparison
      before: decodeCursor(before),
    };
  }

  // Case 3: Simple forward pagination with no cursor (first page)
  if (first) {
    return {
      limit: first + LIMIT_NEXT_PAGE_CHECK,
      // Default to descending order for first pages
      order: 'DESC',
      after: null,
      before: null,
    };
  }

  // Case 4: Simple backward pagination with no cursor (from the end)
  if (last) {
    return {
      limit: last + LIMIT_NEXT_PAGE_CHECK,
      // Use ascending order for last-based pagination
      order: 'ASC',
      after: null,
      before: null,
    };
  }

  // Default case: No pagination parameters specified
  // Return a reasonable default for the most common case
  return {
    limit: DEFAULT_LIMIT + LIMIT_NEXT_PAGE_CHECK,
    order: 'DESC',
    after: null,
    before: null,
  };
}
