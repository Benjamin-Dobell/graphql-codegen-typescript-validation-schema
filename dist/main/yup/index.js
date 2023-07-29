"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YupSchemaVisitor = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const directive_1 = require("../directive");
const visitor_1 = require("../visitor");
const graphql_1 = require("./../graphql");
const importYup = `import * as yup from 'yup'`;
const YupSchemaVisitor = (schema, config) => {
    const importEnums = [];
    const importTypes = [];
    const enumDeclarations = [];
    return {
        buildImports: () => {
            const imports = [importYup];
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
        initialEmit: () => {
            if (!config.withObjectType)
                return '\n' + enumDeclarations.join('\n');
            return ('\n' +
                enumDeclarations.join('\n') +
                '\n' +
                new visitor_plugin_common_1.DeclarationBlock({})
                    .asKind('function')
                    .withName('union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T>')
                    .withBlock([
                    (0, visitor_plugin_common_1.indent)('return yup.mixed<T>().test({'),
                    (0, visitor_plugin_common_1.indent)('test: (value) => schemas.some((schema) => schema.isValidSync(value))', 2),
                    (0, visitor_plugin_common_1.indent)('}).defined()'),
                ].join('\n')).string);
        },
        InputObjectTypeDefinition: {
            leave: (node) => {
                var _a;
                const visitor = new visitor_1.Visitor('input', schema, config);
                const name = visitor.convertName(node.name.value);
                importTypes.push(name);
                const shape = (_a = node.fields) === null || _a === void 0 ? void 0 : _a.map(field => {
                    const fieldSchema = generateFieldYupSchema(config, visitor, field, 2);
                    return (0, graphql_1.isNonNullType)(field.type) ? fieldSchema : `${fieldSchema}.optional()`;
                }).join(',\n');
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('const')
                            .withName(`${name}Schema: yup.ObjectSchema<${name}>`)
                            .withContent(['yup.object({', shape, '})'].join('\n')).string;
                    case 'function':
                    default:
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${name}Schema(): yup.ObjectSchema<${name}>`)
                            .withBlock([(0, visitor_plugin_common_1.indent)(`return yup.object({`), shape, (0, visitor_plugin_common_1.indent)('})')].join('\n')).string;
                }
            },
        },
        ObjectTypeDefinition: {
            leave: (0, graphql_1.ObjectTypeDefinitionBuilder)(config.withObjectType, (node) => {
                var _a;
                const visitor = new visitor_1.Visitor('output', schema, config);
                const name = visitor.convertName(node.name.value);
                importTypes.push(name);
                const shape = (_a = node.fields) === null || _a === void 0 ? void 0 : _a.map(field => {
                    const fieldSchema = generateFieldYupSchema(config, visitor, field, 2);
                    return (0, graphql_1.isNonNullType)(field.type) ? fieldSchema : `${fieldSchema}.optional()`;
                }).join(',\n');
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('const')
                            .withName(`${name}Schema: yup.ObjectSchema<${name}>`)
                            .withContent([
                            `yup.object({`,
                            (0, visitor_plugin_common_1.indent)(`__typename: yup.string<'${node.name.value}'>().optional(),`, 2),
                            shape,
                            '})',
                        ].join('\n')).string;
                    case 'function':
                    default:
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${name}Schema(): yup.ObjectSchema<${name}>`)
                            .withBlock([
                            (0, visitor_plugin_common_1.indent)(`return yup.object({`),
                            (0, visitor_plugin_common_1.indent)(`__typename: yup.string<'${node.name.value}'>().optional(),`, 2),
                            shape,
                            (0, visitor_plugin_common_1.indent)('})'),
                        ].join('\n')).string;
                }
            }),
        },
        EnumTypeDefinition: {
            leave: (node) => {
                var _a, _b;
                const visitor = new visitor_1.Visitor('both', schema, config);
                const enumname = visitor.convertName(node.name.value);
                // hoise enum declarations
                if (config.enumsAsTypes) {
                    const enums = (_a = node.values) === null || _a === void 0 ? void 0 : _a.map(enumOption => `'${enumOption.name.value}'`);
                    enumDeclarations.push(new visitor_plugin_common_1.DeclarationBlock({})
                        .export()
                        .asKind('const')
                        .withName(`${enumname}Schema`)
                        .withContent(`yup.string().oneOf([${enums === null || enums === void 0 ? void 0 : enums.join(', ')}]).defined()`).string);
                }
                else {
                    const values = (_b = node.values) === null || _b === void 0 ? void 0 : _b.map(enumOption => `${enumname}.${visitor.convertName(enumOption.name, {
                        useTypesPrefix: false,
                        transformUnderscore: true,
                    })}`).join(', ');
                    enumDeclarations.push(new visitor_plugin_common_1.DeclarationBlock({})
                        .export()
                        .asKind('const')
                        .withName(`${enumname}Schema`)
                        .withContent(`yup.string<${enumname}>().oneOf([${values}]).defined()`).string);
                    importEnums.push(enumname);
                }
            },
        },
        UnionTypeDefinition: {
            leave: (node) => {
                var _a;
                if (!node.types || !config.withObjectType)
                    return;
                const visitor = new visitor_1.Visitor('output', schema, config);
                const unionName = visitor.convertName(node.name.value);
                importTypes.push(unionName);
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
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('const')
                            .withName(`${unionName}Schema: yup.MixedSchema<${unionName}>`)
                            .withContent(`union<${unionName}>(${unionElements})`).string;
                    case 'function':
                    default:
                        return new visitor_plugin_common_1.DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${unionName}Schema(): yup.MixedSchema<${unionName}>`)
                            .withBlock((0, visitor_plugin_common_1.indent)(`return union<${unionName}>(${unionElements})`)).string;
                }
            },
        },
        // ScalarTypeDefinition: (node) => {
        //   const decl = new DeclarationBlock({})
        //     .export()
        //     .asKind("const")
        //     .withName(`${node.name.value}Schema`);
        //   if (tsVisitor.scalars[node.name.value]) {
        //     const tsType = tsVisitor.scalars[node.name.value];
        //     switch (tsType) {
        //       case "string":
        //         return decl.withContent(`yup.string()`).string;
        //       case "number":
        //         return decl.withContent(`yup.number()`).string;
        //       case "boolean":
        //         return decl.withContent(`yup.boolean()`).string;
        //     }
        //   }
        //   return decl.withContent(`yup.mixed()`).string;
        // },
    };
};
exports.YupSchemaVisitor = YupSchemaVisitor;
const generateFieldYupSchema = (config, visitor, field, indentCount) => {
    let gen = generateFieldTypeYupSchema(config, visitor, field.type);
    if (config.directives && field.directives) {
        const formatted = (0, directive_1.formatDirectiveConfig)(config.directives);
        gen += (0, directive_1.buildApi)(formatted, field.directives);
    }
    return (0, visitor_plugin_common_1.indent)(`${field.name.value}: ${maybeLazy(field.type, gen)}`, indentCount);
};
const generateFieldTypeYupSchema = (config, visitor, type, parentType) => {
    var _a;
    if ((0, graphql_1.isListType)(type)) {
        const gen = generateFieldTypeYupSchema(config, visitor, type.type, type);
        if (!(0, graphql_1.isNonNullType)(parentType)) {
            return `yup.array(${maybeLazy(type.type, gen)}).defined().nullable()`;
        }
        return `yup.array(${maybeLazy(type.type, gen)}).defined()`;
    }
    if ((0, graphql_1.isNonNullType)(type)) {
        const gen = generateFieldTypeYupSchema(config, visitor, type.type, type);
        return maybeLazy(type.type, gen);
    }
    if ((0, graphql_1.isNamedType)(type)) {
        const gen = generateNameNodeYupSchema(config, visitor, type.name);
        if ((0, graphql_1.isNonNullType)(parentType)) {
            if (visitor.shouldEmitAsNotAllowEmptyString(type.name.value)) {
                return `${gen}.required()`;
            }
            return `${gen}.nonNullable()`;
        }
        const typ = visitor.getType(type.name.value);
        if (((_a = typ === null || typ === void 0 ? void 0 : typ.astNode) === null || _a === void 0 ? void 0 : _a.kind) === 'InputObjectTypeDefinition') {
            return `${gen}`;
        }
        return `${gen}.nullable()`;
    }
    console.warn('unhandled type:', type);
    return '';
};
const generateNameNodeYupSchema = (config, visitor, node) => {
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
            return yup4Scalar(config, visitor, node.value);
    }
};
const maybeLazy = (type, schema) => {
    if ((0, graphql_1.isNamedType)(type) && (0, graphql_1.isInput)(type.name.value)) {
        // https://github.com/jquense/yup/issues/1283#issuecomment-786559444
        return `yup.lazy(() => ${schema})`;
    }
    return schema;
};
const yup4Scalar = (config, visitor, scalarName) => {
    var _a;
    if ((_a = config.scalarSchemas) === null || _a === void 0 ? void 0 : _a[scalarName]) {
        return `${config.scalarSchemas[scalarName]}.defined()`;
    }
    const tsType = visitor.getScalarType(scalarName);
    switch (tsType) {
        case 'string':
            return `yup.string().defined()`;
        case 'number':
            return `yup.number().defined()`;
        case 'boolean':
            return `yup.boolean().defined()`;
    }
    console.warn('unhandled name:', scalarName);
    return `yup.mixed()`;
};
