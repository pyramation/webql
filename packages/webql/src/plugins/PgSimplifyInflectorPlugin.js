import { singularize } from 'inflection';
export default function PgSimplifyInflectorPlugin(
  builder,
  { pgSimpleCollections, pgOmitListSuffix, pgSimplifyTableNames }
) {
  const hasConnections = pgSimpleCollections !== 'only';
  const hasSimpleCollections =
    pgSimpleCollections === 'only' || pgSimpleCollections === 'both';
  if (hasConnections && hasSimpleCollections && pgOmitListSuffix) {
    throw new Error(
      'Cannot omit -list suffix (`pgOmitListSuffix`) if both relay connections and simple collections are enabled.'
    );
  }
  if (
    hasSimpleCollections &&
    !hasConnections &&
    pgOmitListSuffix !== true &&
    pgOmitListSuffix !== false
  ) {
      console.warn( // eslint-disable-line
      'You can simplify the inflector further by adding `{graphileOptions: {pgOmitListSuffix: true}}` to the options passed to PostGraphile, however be aware that doing so will mean that later enabling relay connections will be a breaking change. To dismiss this message, set `pgOmitListSuffix` to false instead.'
    );
  }

  builder.hook('inflection', (inflection) => {
    return {
      ...inflection,
      patchField() {
        return this.camelCase('patch');
      },
      tableNode(table) {
        return this.camelCase(
          `${this._singularizedTableName(table)}-by-node-id`
        );
      },
      allRows(table) {
        return this.camelCase(
          this.pluralize(this._singularizedTableName(table))
        );
      },
      allRowsSimple(table) {
        return this.camelCase(
          `${this.pluralize(this._singularizedTableName(table))}-list`
        );
      },
      singleRelationByKeys(detailedKeys, table, _foreignTable, constraint) {
        if (constraint.tags.fieldName) {
          return constraint.tags.fieldName;
        } else if (detailedKeys.length === 1) {
          return this.column(detailedKeys[0]).replace(/id$/i, '');
        }

        return this.camelCase(this._singularizedTableName(table));
      },
      singleRelationByKeysBackwards(
        _detailedKeys,
        table,
        foreignTable,
        constraint
      ) {
        if (constraint.tags.foreignSingleFieldName) {
          return constraint.tags.foreignSingleFieldName;
        } else if (constraint.tags.foreignFieldName) {
          return constraint.tags.foreignFieldName;
        } else if (constraint.tags.fieldName) {
          return constraint.tags.fieldName;
        } else if (pgSimplifyTableNames) {
          const tableName = this._singularizedTableName(table);
          const foreignTableName = this._singularizedTableName(foreignTable);
          if (tableName.startsWith(foreignTableName)) {
            return this.camelCase(
              tableName.replace(`${foreignTableName}_`, '')
            );
          }
        }
        return this.camelCase(this._singularizedTableName(table));
      },
      manyRelationByKeys(detailedKeys, table, foreignTable, constraint) {
        const foreignTableName = this._singularizedTableName(foreignTable);
        if (constraint.tags.foreignFieldName) {
          return constraint.tags.foreignFieldName;
        } else if (detailedKeys.length === 1) {
          const detailedKeyName = this.column(detailedKeys[0]).replace(
            /id$/i,
            ''
          );
          let tableName = this._singularizedTableName(table);

          if (pgSimplifyTableNames && tableName.startsWith(foreignTableName)) {
            tableName = tableName.replace(`${foreignTableName}_`, '');
          }

          return this.camelCase(
            detailedKeyName !== foreignTableName
              ? [detailedKeyName, this.pluralize(tableName)].join('-')
              : this.pluralize(tableName)
          );
        }

        return this.camelCase(
          `${this.pluralize(
            this._singularizedTableName(table)
          )}-by-${detailedKeys
            .map(this.column.bind(this))
            .filter((key) => `${foreignTableName}Id` !== key)
            .join('-and-')}`
        );
      },
      rowByUniqueKeys(detailedKeys, table, constraint) {
        if (constraint.tags.fieldName) {
          return constraint.tags.fieldName;
        } else if (
          detailedKeys.length === 1 &&
          this.column(detailedKeys[0]) === 'id'
        ) {
          // TODO replace all with own inflection lib
          return singularize(
            this.camelCase(this._singularizedTableName(table))
          );
        }
        return this.camelCase(
          `${this._singularizedTableName(table)}-by-${detailedKeys
            .map((key) => this.column(key))
            .join('-and-')}`
        );
      },
      updateByKeys(detailedKeys, table, constraint) {
        if (constraint.tags.updateFieldName) {
          return constraint.tags.updateFieldName;
        }
        if (
          detailedKeys.length === 1 &&
          this.column(detailedKeys[0]) === 'id'
        ) {
          return this.camelCase(`update-${this._singularizedTableName(table)}`);
        }

        return this.camelCase(
          `update-${this._singularizedTableName(
            table
          )}-by-${detailedKeys.map((key) => this.column(key)).join('-and-')}`
        );
      },
      deleteByKeys(detailedKeys, table, constraint) {
        if (constraint.tags.deleteFieldName) {
          return constraint.tags.deleteFieldName;
        } else if (
          detailedKeys.length === 1 &&
          this.column(detailedKeys[0]) === 'id'
        ) {
          return this.camelCase(`delete-${this._singularizedTableName(table)}`);
        }

        return this.camelCase(
          `delete-${this._singularizedTableName(
            table
          )}-by-${detailedKeys.map((key) => this.column(key)).join('-and-')}`
        );
      },
      updateByKeysInputType(detailedKeys, table, constraint) {
        if (constraint.tags.updateFieldName) {
          return this.upperCamelCase(
            `${constraint.tags.updateFieldName}-input`
          );
        } else if (
          detailedKeys.length === 1 &&
          this.column(detailedKeys[0]) === 'id'
        ) {
          return this.camelCase(
            `update-${this._singularizedTableName(table)}-input`
          );
        }

        return this.upperCamelCase(
          `update-${this._singularizedTableName(
            table
          )}-by-${detailedKeys
            .map((key) => this.column(key))
            .join('-and-')}-input`
        );
      },
      deleteByKeysInputType(detailedKeys, table, constraint) {
        if (constraint.tags.deleteFieldName) {
          return this.upperCamelCase(
            `${constraint.tags.deleteFieldName}-input`
          );
        } else if (
          detailedKeys.length === 1 &&
          this.column(detailedKeys[0]) === 'id'
        ) {
          return this.camelCase(
            `delete-${this._singularizedTableName(table)}-input`
          );
        }
        return this.upperCamelCase(
          `delete-${this._singularizedTableName(
            table
          )}-by-${detailedKeys
            .map((key) => this.column(key))
            .join('-and-')}-input`
        );
      },
      updateNode(table) {
        return this.camelCase(
          `update-${this._singularizedTableName(table)}-by-node-id`
        );
      },
      deleteNode(table) {
        return this.camelCase(
          `delete-${this._singularizedTableName(table)}-by-node-id`
        );
      },
      updateNodeInputType(table) {
        return this.upperCamelCase(
          `update-${this._singularizedTableName(table)}-by-node-id-input`
        );
      },
      deleteNodeInputType(table) {
        return this.upperCamelCase(
          `delete-${this._singularizedTableName(table)}-by-node-id-input`
        );
      },
      edgeField(table) {
        return this.camelCase(`${this._singularizedTableName(table)}-edge`);
      },
      scalarFunctionConnection(proc) {
        return this.upperCamelCase(`${this._functionName(proc)}-connection`);
      },
      scalarFunctionEdge(proc) {
        return this.upperCamelCase(
          `${this.singularize(this._functionName(proc))}-edge`
        );
      },
      createField(table) {
        return this.camelCase(`create-${this._singularizedTableName(table)}`);
      },
      createInputType(table) {
        return this.upperCamelCase(
          `create-${this._singularizedTableName(table)}-input`
        );
      },
      createPayloadType(table) {
        return this.upperCamelCase(
          `create-${this._singularizedTableName(table)}-payload`
        );
      },
      updatePayloadType(table) {
        return this.upperCamelCase(
          `update-${this._singularizedTableName(table)}-payload`
        );
      },
      deletePayloadType(table) {
        return this.upperCamelCase(
          `delete-${this._singularizedTableName(table)}-payload`
        );
      }
    };
  });
}
