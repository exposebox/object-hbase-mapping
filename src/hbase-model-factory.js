'use strict';

const _ = require('underscore');

const HBaseModelRepository = require('./hbase-model-repository');

const debug = require('debug')('object-hbase-mapping:hbase-model-factory');

function HBaseModelFactory(hbase, table, columnFamily, fieldMetadata) {

    class HBaseModel {
        constructor(data) {
            let rowKey;

            if (data.rowKey) {
                rowKey = data.rowKey
            } else {
                this.validateRowData(data);

                rowKey = HBaseModel.genKeyByProperties(data)
            }

            _.extend(this,
                {rowKey: rowKey},
                _.pick(data, ...this.constructor.modelFieldNames));
        }

        validateRowData(data) {
            const keyProperties = this.constructor.keyProperties;

            for (let i = 0; i < keyProperties.length; i++) {
                const keyProperty = keyProperties[i];

                if (data[keyProperty] === undefined) {
                    throw new Error(`Missing key property "${keyProperty}"`);
                }
            }
        }

        static fromHBaseRowData(rowkey, data) {
            if (!data) {
                return {rowKey: null};
            }

            const modelData = {rowKey: rowkey};
            if (data) {
                _.each(fieldMetadata, field =>
                    data[field.hbaseName] &&
                    (modelData[field.modelName] = data[field.hbaseName]));
            }

            return new this(modelData);
        }

        static genKeyByProperties(data) {
            return this.keyProperties
                .map(property => {
                    const propertyValue = data[property];

                    if (_.isNumber(propertyValue)) {
                        return propertyValue.toString(36);
                    } else {
                        return propertyValue;
                    }
                })
                .filter(rowKeyPart => !_.isEmpty(rowKeyPart))
                .join('.');
        }

        static getObject(rowkey) {
            const get = new hbase.Get(rowkey);
            _.each(this.constructor.qualifierObjects, qual =>
                get.add(columnFamily, qual));

            return get;
        }

        static scanObject(options) {
            const scan = new hbase.Scan(options);

            _.each(this.constructor.qualifierObjects, qual =>
                scan.add(columnFamily, qual));

            return scan;
        }

        putObject() {
            debug('creating Put for', this);
            const put = new hbase.Put(this.rowKey);
            _.each(fieldMetadata, field => {
                if (!!this[field.modelName]) {
                    put.add(columnFamily, field.hbaseName, {
                        value: this[field.modelName],
                        type: field.type
                    })
                }
            });

            return put;
        }

        save() {
            this.constructor.repository.save(this);
        }

        load() {
            this.constructor.repository.load(this.rowKey);
        }
    }

    HBaseModel.hbase = hbase;
    HBaseModel.columnFamily = columnFamily;
    HBaseModel.keyProperties = _.where(fieldMetadata, {isKeyProperty: true});
    HBaseModel.modelFieldNames = _.pluck(fieldMetadata, 'modelName');
    HBaseModel.hbaseFieldNames = _.pluck(fieldMetadata, 'hbaseName');
    HBaseModel.modelToHbaseField = _.indexBy(fieldMetadata, 'modelName');
    HBaseModel.hbaseFieldToModelField = _.indexBy(fieldMetadata, 'hbaseName');
    HBaseModel.qualifierObjects = _.map(fieldMetadata, field =>
        ({name: field.hbaseName, type: field.type}));
    HBaseModel.repository = new HBaseModelRepository(hbase, table, HBaseModel);

    return HBaseModel;
}

module.exports = HBaseModelFactory;