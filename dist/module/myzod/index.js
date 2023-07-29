import { DeclarationBlock, indent } from '@graphql-codegen/visitor-plugin-common';
import { buildApi, formatDirectiveConfig } from '../directive';
import { Visitor } from '../visitor';
import { isInput, isListType, isNamedType, isNonNullType, ObjectTypeDefinitionBuilder } from './../graphql';
const importZod = `import * as myzod from 'myzod'`;
const anySchema = `definedNonNullAnySchema`;
export const MyZodSchemaVisitor = (schema, config) => {
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
                new DeclarationBlock({}).export().asKind('const').withName(`${anySchema}`).withContent(`myzod.object({})`)
                    .string,
                ...enumDeclarations,
            ].join('\n'),
        InputObjectTypeDefinition: {
            leave: (node) => {
                const visitor = new Visitor('input', schema, config);
                const name = visitor.convertName(node.name.value);
                importTypes.push(name);
                const shape = node.fields?.map(field => generateFieldMyZodSchema(config, visitor, field, 2)).join(',\n');
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new DeclarationBlock({})
                            .export()
                            .asKind('const')
                            .withName(`${name}Schema: myzod.Type<${name}>`)
                            .withContent(['myzod.object({', shape, '})'].join('\n')).string;
                    case 'function':
                    default:
                        return new DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${name}Schema(): myzod.Type<${name}>`)
                            .withBlock([indent(`return myzod.object({`), shape, indent('})')].join('\n')).string;
                }
            },
        },
        ObjectTypeDefinition: {
            leave: ObjectTypeDefinitionBuilder(config.withObjectType, (node) => {
                const visitor = new Visitor('output', schema, config);
                const name = visitor.convertName(node.name.value);
                importTypes.push(name);
                const shape = node.fields?.map(field => generateFieldMyZodSchema(config, visitor, field, 2)).join(',\n');
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new DeclarationBlock({})
                            .export()
                            .asKind('const')
                            .withName(`${name}Schema: myzod.Type<${name}>`)
                            .withContent([
                            `myzod.object({`,
                            indent(`__typename: myzod.literal('${node.name.value}').optional(),`, 2),
                            shape,
                            '})',
                        ].join('\n')).string;
                    case 'function':
                    default:
                        return new DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${name}Schema(): myzod.Type<${name}>`)
                            .withBlock([
                            indent(`return myzod.object({`),
                            indent(`__typename: myzod.literal('${node.name.value}').optional(),`, 2),
                            shape,
                            indent('})'),
                        ].join('\n')).string;
                }
            }),
        },
        EnumTypeDefinition: {
            leave: (node) => {
                const visitor = new Visitor('both', schema, config);
                const enumname = visitor.convertName(node.name.value);
                // hoist enum declarations
                if (config.enumsAsTypes) {
                    // z.enum are basically myzod.literals
                    enumDeclarations.push(new DeclarationBlock({})
                        .export()
                        .asKind('type')
                        .withName(`${enumname}Schema`)
                        .withContent(`myzod.literals(${node.values?.map(enumOption => `'${enumOption.name.value}'`).join(', ')})`)
                        .string);
                }
                else {
                    enumDeclarations.push(new DeclarationBlock({})
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
                if (!node.types || !config.withObjectType)
                    return;
                const visitor = new Visitor('output', schema, config);
                const unionName = visitor.convertName(node.name.value);
                const unionElements = node.types
                    ?.map(t => {
                    const element = visitor.convertName(t.name.value);
                    const typ = visitor.getType(t.name.value);
                    if (typ?.astNode?.kind === 'EnumTypeDefinition') {
                        return `${element}Schema`;
                    }
                    switch (config.validationSchemaExportType) {
                        case 'const':
                            return `${element}Schema`;
                        case 'function':
                        default:
                            return `${element}Schema()`;
                    }
                })
                    .join(', ');
                const unionElementsCount = node.types?.length ?? 0;
                const union = unionElementsCount > 1 ? `myzod.union([${unionElements}])` : unionElements;
                switch (config.validationSchemaExportType) {
                    case 'const':
                        return new DeclarationBlock({}).export().asKind('const').withName(`${unionName}Schema`).withContent(union)
                            .string;
                    case 'function':
                    default:
                        return new DeclarationBlock({})
                            .export()
                            .asKind('function')
                            .withName(`${unionName}Schema()`)
                            .withBlock(indent(`return ${union}`)).string;
                }
            },
        },
    };
};
const generateFieldMyZodSchema = (config, visitor, field, indentCount) => {
    const gen = generateFieldTypeMyZodSchema(config, visitor, field, field.type);
    return indent(`${field.name.value}: ${maybeLazy(field.type, gen)}`, indentCount);
};
const generateFieldTypeMyZodSchema = (config, visitor, field, type, parentType) => {
    if (isListType(type)) {
        const gen = generateFieldTypeMyZodSchema(config, visitor, field, type.type, type);
        if (!isNonNullType(parentType)) {
            const arrayGen = `myzod.array(${maybeLazy(type.type, gen)})`;
            const maybeLazyGen = applyDirectives(config, field, arrayGen);
            return `${maybeLazyGen}.optional().nullable()`;
        }
        return `myzod.array(${maybeLazy(type.type, gen)})`;
    }
    if (isNonNullType(type)) {
        const gen = generateFieldTypeMyZodSchema(config, visitor, field, type.type, type);
        return maybeLazy(type.type, gen);
    }
    if (isNamedType(type)) {
        const gen = generateNameNodeMyZodSchema(config, visitor, type.name);
        if (isListType(parentType)) {
            return `${gen}.nullable()`;
        }
        const appliedDirectivesGen = applyDirectives(config, field, gen);
        if (isNonNullType(parentType)) {
            if (visitor.shouldEmitAsNotAllowEmptyString(type.name.value)) {
                return `${gen}.min(1)`;
            }
            return appliedDirectivesGen;
        }
        if (isListType(parentType)) {
            return `${appliedDirectivesGen}.nullable()`;
        }
        return `${appliedDirectivesGen}.optional().nullable()`;
    }
    console.warn('unhandled type:', type);
    return '';
};
const applyDirectives = (config, field, gen) => {
    if (config.directives && field.directives) {
        const formatted = formatDirectiveConfig(config.directives);
        return gen + buildApi(formatted, field.directives);
    }
    return gen;
};
const generateNameNodeMyZodSchema = (config, visitor, node) => {
    const converter = visitor.getNameNodeConverter(node);
    switch (converter?.targetKind) {
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
    if (isNamedType(type) && isInput(type.name.value)) {
        return `myzod.lazy(() => ${schema})`;
    }
    return schema;
};
const myzod4Scalar = (config, visitor, scalarName) => {
    if (config.scalarSchemas?.[scalarName]) {
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
