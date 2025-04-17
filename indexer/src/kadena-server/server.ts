/**
 * @file server.ts
 * @description GraphQL server initialization and configuration for the Kadena Indexer
 *
 * This file sets up and configures the Apollo GraphQL server that serves as the primary
 * API interface for the Kadena Indexer. It includes:
 *
 * - Apollo Server setup with schema and resolvers
 * - WebSocket subscription support
 * - Express middleware configuration
 * - CORS security controls
 * - Query complexity analysis to prevent DoS attacks
 * - Pagination parameter validation
 * - IP filtering for sensitive endpoints
 * - Event dispatch for real-time updates
 *
 * The server implements both HTTP (for queries and mutations) and WebSocket (for
 * subscriptions) protocols, allowing for real-time data updates and efficient
 * data fetching with advanced filtering and pagination.
 */

import { ApolloServer, ApolloServerPlugin } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { resolvers } from './resolvers';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createGraphqlContext,
  publishSubscribe,
  ResolverContext,
} from './config/apollo-server-config';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ArgumentNode, ASTNode, GraphQLError, Kind } from 'graphql';
import {
  EVENTS_EVENT,
  NEW_BLOCKS_EVENT,
  NEW_BLOCKS_FROM_DEPTH_EVENT,
  TRANSACTION_EVENT,
} from './resolvers/subscription/consts';
import { dispatchInfoSchema } from '../jobs/publisher-job';
import initCache from '../cache/init';
import { getRequiredEnvString } from '../utils/helpers';
import ipRangeCheck from 'ip-range-check';
import {
  directiveEstimator,
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';
import { depthLimit } from '@graphile/depth-limit';

/**
 * Maximum allowed complexity for GraphQL queries
 *
 * This value (2500) sets the upper bound for allowed query complexity.
 * It serves as a protection mechanism against resource-intensive queries that could
 * potentially overload the server or deplete resources. The complexity value is determined
 * by the query depth, breadth, and field-specific complexity values defined through
 * directives or extensions.
 *
 * If a query exceeds this complexity, it will be rejected before execution.
 */
const MAX_COMPLEXITY = 2500;

/**
 * GraphQL schema definition
 *
 * Loads the GraphQL schema from a file, which defines all available:
 * - Types (objects, inputs, interfaces, unions, enums)
 * - Queries (data retrieval operations)
 * - Mutations (data modification operations)
 * - Subscriptions (real-time update channels)
 *
 * This schema is the contract between the API and its clients.
 */
const typeDefs = readFileSync(join(__dirname, './config/schema.graphql'), 'utf-8');

/**
 * The port on which the GraphQL API will listen
 */
const KADENA_GRAPHQL_API_PORT = getRequiredEnvString('KADENA_GRAPHQL_API_PORT');

/**
 * Array of domains allowed to access the GraphQL API
 */
const ALLOWED_ORIGINS = [process.env.API_GATEWAY_URL ?? '', process.env.API_KADENA_URL ?? ''];

/**
 * Apollo Server plugin that validates pagination parameters in GraphQL requests
 *
 * This plugin enforces the Relay Connection Specification for cursor-based pagination
 * by validating that clients aren't using incompatible pagination parameters together.
 *
 * It validates four key rules:
 * 1. `after` and `before` cursors cannot be used together (can't paginate forward and
 *    backward simultaneously)
 * 2. `first` and `last` count limiters cannot be used together (can't request both the
 *    first N and last N items)
 * 3. `before` cursor cannot be used with `first` count (incompatible pagination directions)
 * 4. `after` cursor cannot be used with `last` count (incompatible pagination directions)
 *
 * The plugin works by:
 * - Extracting inline arguments from the query AST (Abstract Syntax Tree)
 * - Handling different argument types (string, int, float, boolean)
 * - Combining these with explicitly provided variables
 * - Checking for prohibited combinations and throwing helpful error messages
 *
 * This ensures consistent pagination behavior across the API and prevents clients
 * from making logically contradictory requests.
 */
const validatePaginationParamsPlugin: ApolloServerPlugin = {
  requestDidStart: async () => ({
    didResolveOperation: async ({ request, document }) => {
      const variables = { ...request.variables }; // External variables
      // prettier-ignore
      const inlineArguments: Record<string, any> = {};

      // Helper function to extract inline arguments
      const extractArguments = (node: ASTNode) => {
        if (node.kind === Kind.FIELD && node.arguments) {
          node.arguments.forEach((arg: ArgumentNode) => {
            if (arg.value.kind === Kind.STRING) {
              inlineArguments[arg.name.value] = arg.value.value;
            } else if (arg.value.kind === Kind.INT) {
              inlineArguments[arg.name.value] = parseInt(arg.value.value, 10);
            } else if (arg.value.kind === Kind.FLOAT) {
              inlineArguments[arg.name.value] = parseFloat(arg.value.value);
            } else if (arg.value.kind === Kind.BOOLEAN) {
              inlineArguments[arg.name.value] = arg.value.value === true;
            }
          });
        }
        if (node.kind === Kind.SELECTION_SET) {
          node.selections.forEach(selection => extractArguments(selection));
        }
      };

      // Traverse the query AST to extract inline arguments
      if (document) {
        document.definitions.forEach(definition => {
          if (definition.kind === Kind.OPERATION_DEFINITION && definition.selectionSet) {
            extractArguments(definition.selectionSet);
          }
        });
      }

      // Combine variables and inline arguments
      const combinedVariables = { ...inlineArguments, ...variables };
      const { after, before, first, last } = combinedVariables;

      // Validation logic - enforcing Relay pagination rules
      if (after && before) {
        throw new GraphQLError(
          'You cannot use both "after" and "before" at the same time. Please use only one or none.',
        );
      }

      if (first && last) {
        throw new GraphQLError(
          'You cannot use both "first" and "last" at the same time. Please use only one or none.',
        );
      }

      if (before && first) {
        throw new GraphQLError(
          'You cannot use both "before" and "first" at the same time. Use before with last or after with first instead.',
        );
      }

      if (after && last) {
        throw new GraphQLError(
          'You cannot use both "after" and "last" at the same time. Use before with last or after with first instead.',
        );
      }
    },
  }),
};

/**
 * List of allowed CIDR ranges for restricted endpoints
 * These ranges restrict access to sensitive operations to trusted IP addresses
 */
const allowedCIDRs = ['10.0.2.0/24', '10.0.3.0/24'];

/**
 * Middleware that filters requests based on IP address
 *
 * Restricts access to sensitive endpoints (like /new-block) to only allow
 * requests from trusted IP ranges specified in allowedCIDRs.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
const ipFilterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.ip && ipRangeCheck(req.ip, allowedCIDRs)) {
    next(); // Allow access
  } else {
    res.status(403).json({ message: 'Access denied: IP not allowed' });
  }
};

/**
 * Checks if an origin is allowed to access the GraphQL API
 *
 * Implements CORS policy by validating origin domains against the allowed list.
 * Permits localhost for development and allows both exact matches and subdomains
 * of kadena.io.
 *
 * @param origin - The origin domain requesting access
 * @returns Boolean indicating if the origin is allowed
 */
const isAllowedOrigin = (origin: string): boolean => {
  try {
    const originUrl = new URL(origin);
    if (originUrl.hostname === 'localhost') return true;

    return ALLOWED_ORIGINS.some(allowed => {
      const allowedUrl = new URL(allowed);
      // Check if it's an exact match
      if (originUrl.origin === allowedUrl.origin) return true;
      // Check if it's a subdomain (only for kadena.io)
      if (allowedUrl.hostname === 'kadena.io' && originUrl.hostname.endsWith('.kadena.io')) {
        return true;
      }
      return false;
    });
  } catch {
    return false;
  }
};

/**
 * Initializes and starts the GraphQL server
 *
 * Sets up the Apollo Server with:
 * - GraphQL schema and resolvers
 * - Express middleware for HTTP requests
 * - WebSocket server for subscriptions
 * - Security plugins including query complexity analysis and depth limiting
 * - Custom endpoints for blockchain event notifications
 * - CORS configuration to restrict access to allowed origins
 *
 * This function bootstraps the entire GraphQL API service and begins listening
 * for requests on the configured port.
 */
export async function useKadenaGraphqlServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<ResolverContext>({
    typeDefs,
    resolvers,
    introspection: true,
    validationRules: [
      depthLimit({
        maxDepth: 15, // Reasonable depth for most queries
        maxListDepth: 8, // Prevent deeply nested array queries
        maxSelfReferentialDepth: 3, // Limit recursive queries
        maxIntrospectionDepth: 15, // Limit introspection query depth
        maxIntrospectionListDepth: 8, // Limit introspection array depth
        maxIntrospectionSelfReferentialDepth: 3,
        revealDetails: false, // Don't expose limits to clients
      }),
    ],
    plugins: [
      validatePaginationParamsPlugin,
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
      {
        requestDidStart: async () => ({
          /**
           * Query complexity analysis middleware
           *
           * Calculates the complexity of incoming GraphQL queries to prevent
           * resource exhaustion attacks. Rejects queries that exceed the
           * maximum allowed complexity threshold.
           */
          async didResolveOperation({ request, document }) {
            // Skip complexity check for introspection or Apollo can't get the schemas
            if (request.operationName == 'IntrospectionQuery') return;
            /**
             * Provides GraphQL query analysis to be able to react on complex queries to the GraphQL server
             * It can be used to protect the GraphQL server against resource exhaustion and DoS attacks
             * More documentation can be found at https://github.com/ivome/graphql-query-complexity
             */
            const complexity = getComplexity({
              // GraphQL schema
              schema,
              // To calculate query complexity properly,
              // check only the requested operation
              // not the whole document that may contains multiple operations
              operationName: request.operationName,
              // GraphQL query document
              query: document,
              // GraphQL query variables
              variables: request.variables,
              // Add any number of estimators. The estimators are invoked in order, the first
              // numeric value that is being returned by an estimator is used as the field complexity
              // If no estimator returns a value, an exception is raised
              estimators: [
                // Using fieldExtensionsEstimator is mandatory to make it work with type-graphql
                fieldExtensionsEstimator(),
                // Add directive support
                directiveEstimator({
                  // Optionally change the name of the directive here... Default value is `complexity`
                  name: 'complexity',
                }),
                // Add more estimators here...
                // This will assign each field a complexity of 1
                // if no other estimator returned a value
                simpleEstimator({ defaultComplexity: 1 }),
              ],
            });

            // React to the calculated complexity,
            // like compare it with max and throw error when the threshold is reached
            if (complexity > MAX_COMPLEXITY) {
              throw new Error(
                `Sorry, too complicated query! Exceeded the maximum allowed complexity.`,
              );
            }
          },
        }),
      },
    ],
  });
  await server.start();

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const context = await createGraphqlContext();

  // Set up WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  /**
   * Configure WebSocket server for GraphQL subscriptions with cleanup handling
   *
   * This setup integrates the WebSocket server with the GraphQL schema to support
   * real-time subscriptions. Key features include:
   *
   * 1. Context initialization for each subscription with:
   *    - An AbortController to manage subscription lifecycle
   *    - Event listener that automatically aborts when connection closes
   *    - Signal passing for clean termination of long-running operations
   *
   * 2. Resource cleanup handling:
   *    - The serverCleanup object provides a dispose() method
   *    - This method is called during server shutdown in the drainServer function
   *    - Ensures all subscriptions are properly terminated when server stops
   *
   * This mechanism prevents memory leaks by ensuring subscription resources
   * are released when clients disconnect or when the server shuts down.
   */
  const serverCleanup = useServer(
    {
      schema,
      context: async ctx => {
        const abortController = new AbortController();

        ctx.extra.socket.addEventListener('close', () => {
          abortController.abort(); // Only aborts this specific subscription
        });

        return {
          ...context,
          signal: abortController.signal, // Pass signal per subscription
        };
      },
    },
    wsServer,
  );
  app.use(express.json());

  // Configure CORS and Express middleware for GraphQL endpoint
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: (origin, callback) => {
        if (!origin || origin === 'null') {
          return callback(null, false);
        }

        try {
          if (isAllowedOrigin(origin)) {
            return callback(null, true);
          }
          return callback(new Error(`[ERROR][CORS][ORIGIN] Origin ${origin} not allowed by CORS`));
        } catch (error) {
          return callback(null, false);
        }
      },
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Cache-Control',
        'Pragma',
      ],
      exposedHeaders: ['Access-Control-Allow-Origin'],
      credentials: true,
      maxAge: 86400, // 24 hours
    }),
    expressMiddleware(server, {
      context: createGraphqlContext,
    }),
  );

  /**
   * Handle CORS preflight OPTIONS requests explicitly
   *
   * This endpoint manages the CORS preflight requests that browsers send before making
   * actual API requests. It's a critical security component that:
   *
   * 1. Validates the origin against the allowed domains list
   * 2. Sets appropriate CORS headers when origins are allowed:
   *    - Access-Control-Allow-Origin: Reflects the allowed origin
   *    - Access-Control-Allow-Credentials: Enables authenticated requests
   *    - Access-Control-Allow-Methods: Limits to POST and OPTIONS methods
   *    - Access-Control-Allow-Headers: Specifies allowed request headers
   *    - Access-Control-Max-Age: Caches preflight result for 24 hours (86400s)
   * 3. Returns 204 No Content for allowed origins or 403 Forbidden for disallowed ones
   *
   * This explicit handling ensures precise control over cross-origin security,
   * preventing unauthorized domains from accessing the API while allowing
   * legitimate client applications to function properly.
   */
  app.options('*', (req: Request, res: Response) => {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control, Pragma',
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      res.status(204).end();
    } else {
      res.status(403).end();
    }
  });

  /**
   * Endpoint to receive new block notifications
   *
   * This route receives notifications from the blockchain indexer when new blocks
   * are added. It validates the input and dispatches events to active subscriptions
   * for real-time updates. Access is restricted to trusted IPs.
   */
  app.post('/new-block', ipFilterMiddleware, async (req, res) => {
    const payload = await dispatchInfoSchema.safeParseAsync(req.body);
    if (!payload.success) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const { hash, chainId, height, requestKeys, qualifiedEventNames } = payload.data;

    publishSubscribe.publish(NEW_BLOCKS_EVENT, {
      hash,
      chainId,
    });

    publishSubscribe.publish(NEW_BLOCKS_FROM_DEPTH_EVENT, {
      height,
      chainId,
      hash,
    });

    const eventPromises = qualifiedEventNames.map(qualifiedEventName => {
      return publishSubscribe.publish(EVENTS_EVENT, {
        qualifiedEventName,
        height,
        chainId,
        hash,
      });
    });

    const transactionPromises = requestKeys.map(requestKey => {
      return publishSubscribe.publish(TRANSACTION_EVENT, {
        chainId,
        requestKey,
      });
    });

    await Promise.all([...eventPromises, ...transactionPromises]);

    res.json({
      message: 'New block published.',
    });
  });

  // Initialize cache and start the server
  await initCache(context);
  await new Promise<void>(resolve => httpServer.listen({ port: KADENA_GRAPHQL_API_PORT }, resolve));
  console.info(`[INFO][API][BIZ_FLOW] GraphQL server started on port ${KADENA_GRAPHQL_API_PORT}.`);
}
