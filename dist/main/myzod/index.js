"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyZodSchemaVisitor = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const directive_1 = require("../directive");
const visitor_1 = require("../visitor");
const graphql_1 = require("./../graphql");
const importZod = `import * as myzod from 'myzod'`;
const anySchema = `definedNonNullAnySchema`;
const MyZodSchemaVisitor = (schema, config) => {
    const importEnums = [];
    const importTypes = [];
    const enumDeclarations = [];
    return {
        buildImports: () => {
            const imports = [importZod];
            if (config.importFrom) {
                const declarations = config.useTypeImports ? importEnums : [...importEnums, ...importTypes];
                const types = config.useTypeImports ? importTypes : [];
                if (declarations.length > 0) {
                    imports.push(`import { ${declarations.join(', ')} } from '${config.importFrom}'`);
                }
                if (types.length > 0) {
                    imports.push(`import type { ${types.join(', ')} } from '${config.importFrom}'`);
                }
            }
            return imports;
        },
        initialEmit: () => '\n' +
            [
                new visitor_plugin_common_1.DeclarationBlock({}).export().asKind('const').withName(`${anySchema}`).withContent(`myzod.object({})`)
                    .string,
                ...enumDeclarations,
            ].join('\n'),
        InputObjectTypeDefinition: {
            leave: (node) => {
                var _a;
                const visitor = new visitor_1.Visitor('input', schema, config);
                const name = visitor.convertName(node.name.value);
                importTypes.push(name);
                const shape = (_a = node.fields) === null || _a === void 0 ? void 0 : _a.map(field => generateFieldMyZodSchema(config, visitor, field, 2)).join(',\n');
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('const')
                            .withName(`${name}Schema: myzod.Type<${name}>`)
                            .withContent(['myzod.object({', shape, '})'].join('\n')).string;
                    case 'function':
                    default:
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${name}Schema(): myzod.Type<${name}>`)
                            .withBlock([(0, visitor_plugin_common_1.indent)(`return myzod.object({`), shape, (0, visitor_plugin_common_1.indent)('})')].join('\n')).string;
                }
            },
        },
        ObjectTypeDefinition: {
            leave: (0, graphql_1.ObjectTypeDefinitionBuilder)(config.withObjectType, (node) => {
                var _a;
                const visitor = new visitor_1.Visitor('output', schema, config);
                const name = visitor.convertName(node.name.value);
                importTypes.push(name);
                const shape = (_a = node.fields) === null || _a === void 0 ? void 0 : _a.map(field => generateFieldMyZodSchema(config, visitor, field, 2)).join(',\n');
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('const')
                            .withName(`${name}Schema: myzod.Type<${name}>`)
                            .withContent([
                            `myzod.object({`,
                            (0, visitor_plugin_common_1.indent)(`__typename: myzod.literal('${node.name.value}').optional(),`, 2),
                            shape,
                            '})',
                        ].join('\n')).string;
                    case 'function':
                    default:
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${name}Schema(): myzod.Type<${name}>`)
                            .withBlock([
                            (0, visitor_plugin_common_1.indent)(`return myzod.object({`),
                            (0, visitor_plugin_common_1.indent)(`__typename: myzod.literal('${node.name.value}').optional(),`, 2),
                            shape,
                            (0, visitor_plugin_common_1.indent)('})'),
                        ].join('\n')).string;
                }
            }),
        },
        EnumTypeDefinition: {
            leave: (node) => {
                var _a;
                const visitor = new visitor_1.Visitor('both', schema, config);
                const enumname = visitor.convertName(node.name.value);
                // hoist enum declarations
                if (config.enumsAsTypes) {
                    // z.enum are basically myzod.literals
                    enumDeclarations.push(new visitor_plugin_common_1.DeclarationBlock({})
                        .export()
                        .asKind('type')
                        .withName(`${enumname}Schema`)
                        .withContent(`myzod.literals(${(_a = node.values) === null || _a === void 0 ? void 0 : _a.map(enumOption => `'${enumOption.name.value}'`).join(', ')})`)
                        .string);
                }
                else {
                    enumDeclarations.push(new visitor_plugin_common_1.DeclarationBlock({})
                        .export()
                        .asKind('const')
                        .withName(`${enumname}Schema`)
                        .withContent(`myzod.enum(${enumname})`).string);
                    importEnums.push(enumname);
                }
            },
        },
        UnionTypeDefinition: {
            leave: (node) => {
                var _a, _b, _c;
                if (!node.types || !config.withObjectType)
                    return;
                const visitor = new visitor_1.Visitor('output', schema, config);
                const unionName = visitor.convertName(node.name.value);
                const unionElements = (_a = node.types) === null || _a === void 0 ? void 0 : _a.map(t => {
                    var _a;
                    const element = visitor.convertName(t.name.value);
                    const typ = visitor.getType(t.name.value);
                    if (((_a = typ === null || typ === void 0 ? void 0 : typ.astNode) === null || _a === void 0 ? void 0 : _a.kind) === 'EnumTypeDefinition') {
                        return `${element}Schema`;
                    }
                    switch (config.validationSchemaExportType) {
                        case 'const':
                            return `${element}Schema`;
                        case 'function':
                        default:
                            return `${element}Schema()`;
                    }
                }).join(', ');
                const unionElementsCount = (_c = (_b = node.types) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0;
                const union = unionElementsCount > 1 ? `myzod.union([${unionElements}])` : unionElements;
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new visitor_plugin_common_1.DeclarationBlock({}).export().asKind('const').withName(`${unionName}Schema`).withContent(union)
                            .string;
                    case 'function':
                    default:
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${unionName}Schema()`)
                            .withBlock((0, visitor_plugin_common_1.indent)(`return ${union}`)).string;
                }
            },
        },
    };
};
exports.MyZodSchemaVisitor = MyZodSchemaVisitor;
const generateFieldMyZodSchema = (config, visitor, field, indentCount) => {
    const gen = generateFieldTypeMyZodSchema(config, visitor, field, field.type);
    return (0, visitor_plugin_common_1.indent)(`${field.name.value}: ${maybeLazy(field.type, gen)}`, indentCount);
};
const generateFieldTypeMyZodSchema = (config, visitor, field, type, parentType) => {
    if ((0, graphql_1.isListType)(type)) {
        const gen = generateFieldTypeMyZodSchema(config, visitor, field, type.type, type);
        if (!(0, graphql_1.isNonNullType)(parentType)) {
            const arrayGen = `myzod.array(${maybeLazy(type.type, gen)})`;
            const maybeLazyGen = applyDirectives(config, field, arrayGen);
            return `${maybeLazyGen}.optional().nullable()`;
        }
        return `myzod.array(${maybeLazy(type.type, gen)})`;
    }
    if ((0, graphql_1.isNonNullType)(type)) {
        const gen = generateFieldTypeMyZodSchema(config, visitor, field, type.type, type);
        return maybeLazy(type.type, gen);
    }
    if ((0, graphql_1.isNamedType)(type)) {
        const gen = generateNameNodeMyZodSchema(config, visitor, type.name);
        if ((0, graphql_1.isListType)(parentType)) {
            return `${gen}.nullable()`;
        }
        const appliedDirectivesGen = applyDirectives(config, field, gen);
        if ((0, graphql_1.isNonNullType)(parentType)) {
            if (visitor.shouldEmitAsNotAllowEmptyString(type.name.value)) {
                return `${gen}.min(1)`;
            }
            return appliedDirectivesGen;
        }
        if ((0, graphql_1.isListType)(parentType)) {
            return `${appliedDirectivesGen}.nullable()`;
        }
        return `${appliedDirectivesGen}.optional().nullable()`;
    }
    console.warn('unhandled type:', type);
    return '';
};
const applyDirectives = (config, field, gen) => {
    if (config.directives && field.directives) {
        const formatted = (0, directive_1.formatDirectiveConfig)(config.directives);
        return gen + (0, directive_1.buildApi)(formatted, field.directives);
    }
    return gen;
};
const generateNameNodeMyZodSchema = (config, visitor, node) => {
    const converter = visitor.getNameNodeConverter(node);
    switch (converter === null || converter === void 0 ? void 0 : converter.targetKind) {
        case 'InputObjectTypeDefinition':
        case 'ObjectTypeDefinition':
        case 'UnionTypeDefinition':
            // using switch-case rather than if-else to allow for future expansion
            switch (config.validationSchemaExportType) {
                case 'const':
                    return `${converter.convertName()}Schema`;
                case 'function':
                default:
                    return `${converter.convertName()}Schema()`;
            }
        case 'EnumTypeDefinition':
            return `${converter.convertName()}Schema`;
        default:
            return myzod4Scalar(config, visitor, node.value);
    }
};
const maybeLazy = (type, schema) => {
    if ((0, graphql_1.isNamedType)(type) && (0, graphql_1.isInput)(type.name.value)) {
        return `myzod.lazy(() => ${schema})`;
    }
    return schema;
};
const myzod4Scalar = (config, visitor, scalarName) => {
    var _a;
    if ((_a = config.scalarSchemas) === null || _a === void 0 ? void 0 : _a[scalarName]) {
        return config.scalarSchemas[scalarName];
    }
    const tsType = visitor.getScalarType(scalarName);
    switch (tsType) {
        case 'string':
            return `myzod.string()`;
        case 'number':
            return `myzod.number()`;
        case 'boolean':
            return `myzod.boolean()`;
    }
    console.warn('unhandled name:', scalarName);
    return anySchema;
};
