import { GraphQLSchema } from 'graphql';
import { ValidationSchemaPluginConfig } from '../config';
import { SchemaVisitor } from '../types';
export declare const ZodSchemaVisitor: (schema: GraphQLSchema, config: ValidationSchemaPluginConfig) => SchemaVisitor;
