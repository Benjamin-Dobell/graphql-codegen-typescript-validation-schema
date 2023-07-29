"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = void 0;
const schema_ast_1 = require("@graphql-codegen/schema-ast");
const graphql_1 = require("graphql");
const graphql_2 = require("./graphql");
const index_1 = require("./myzod/index");
const index_2 = require("./yup/index");
const index_3 = require("./zod/index");
const plugin = (schema, _documents, config) => {
    const { schema: _schema, ast } = _transformSchemaAST(schema, config);
    const _a = schemaVisitor(_schema, config), { buildImports, initialEmit } = _a, visitor = __rest(_a, ["buildImports", "initialEmit"]);
    const result = (0, graphql_1.visit)(ast, visitor);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const generated = result.definitions.filter(def => typeof def === 'string');
    return {
        prepend: buildImports(),
        content: [initialEmit(), ...generated].join('\n'),
    };
};
exports.plugin = plugin;
const schemaVisitor = (schema, config) => {
    if ((config === null || config === void 0 ? void 0 : config.schema) === 'zod') {
        return (0, index_3.ZodSchemaVisitor)(schema, config);
    }
    else if ((config === null || config === void 0 ? void 0 : config.schema) === 'myzod') {
        return (0, index_1.MyZodSchemaVisitor)(schema, config);
    }
    return (0, index_2.YupSchemaVisitor)(schema, config);
};
const _transformSchemaAST = (schema, config) => {
    const { schema: _schema, ast } = (0, schema_ast_1.transformSchemaAST)(schema, config);
    // See: https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/issues/394
    const __schema = (0, graphql_2.isGeneratedByIntrospection)(_schema) ? (0, graphql_1.buildSchema)((0, graphql_1.printSchema)(_schema)) : _schema;
    // This affects the performance of code generation, so it is
    // enabled only when this option is selected.
    if (config.validationSchemaExportType === 'const') {
        return {
            schema: __schema,
            ast: (0, graphql_2.topologicalSortAST)(__schema, ast),
        };
    }
    return {
        schema: __schema,
        ast,
    };
};
