import { TsVisitor } from '@graphql-codegen/typescript';
import { specifiedScalarTypes } from 'graphql';
export class Visitor extends TsVisitor {
    scalarDirection;
    schema;
    pluginConfig;
    constructor(scalarDirection, schema, pluginConfig) {
        super(schema, pluginConfig);
        this.scalarDirection = scalarDirection;
        this.schema = schema;
        this.pluginConfig = pluginConfig;
    }
    isSpecifiedScalarName(scalarName) {
        return specifiedScalarTypes.some(({ name }) => name === scalarName);
    }
    getType(name) {
        return this.schema.getType(name);
    }
    getNameNodeConverter(node) {
        const typ = this.schema.getType(node.value);
        const astNode = typ?.astNode;
        if (astNode === undefined || astNode === null) {
            return undefined;
        }
        return {
            targetKind: astNode.kind,
            convertName: () => this.convertName(astNode.name.value),
        };
    }
    getScalarType(scalarName) {
        if (this.scalarDirection === 'both') {
            return null;
        }
        return this.scalars[scalarName][this.scalarDirection];
    }
    shouldEmitAsNotAllowEmptyString(name) {
        if (this.pluginConfig.notAllowEmptyString !== true) {
            return false;
        }
        const typ = this.getType(name);
        if (typ?.astNode?.kind !== 'ScalarTypeDefinition' && !this.isSpecifiedScalarName(name)) {
            return false;
        }
        const tsType = this.getScalarType(name);
        return tsType === 'string';
    }
}
