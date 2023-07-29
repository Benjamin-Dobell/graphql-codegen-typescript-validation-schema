"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Visitor = void 0;
const typescript_1 = require("@graphql-codegen/typescript");
const graphql_1 = require("graphql");
class Visitor extends typescript_1.TsVisitor {
    constructor(scalarDirection, schema, pluginConfig) {
        super(schema, pluginConfig);
        this.scalarDirection = scalarDirection;
        this.schema = schema;
        this.pluginConfig = pluginConfig;
    }
    isSpecifiedScalarName(scalarName) {
        return graphql_1.specifiedScalarTypes.some(({ name }) => name === scalarName);
    }
    getType(name) {
        return this.schema.getType(name);
    }
    getNameNodeConverter(node) {
        const typ = this.schema.getType(node.value);
        const astNode = typ === null || typ === void 0 ? void 0 : typ.astNode;
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
        var _a;
        if (this.pluginConfig.notAllowEmptyString !== true) {
            return false;
        }
        const typ = this.getType(name);
        if (((_a = typ === null || typ === void 0 ? void 0 : typ.astNode) === null || _a === void 0 ? void 0 : _a.kind) !== 'ScalarTypeDefinition' && !this.isSpecifiedScalarName(name)) {
            return false;
        }
        const tsType = this.getScalarType(name);
        return tsType === 'string';
    }
}
exports.Visitor = Visitor;
