'use strict';

const _ = require('underscore');

const HBaseModelRepository = require('./hbase-model-repository');

const debug = require('debug')('object-hbase-mapping:hbase-model-factory');

function HBaseModelFactory(hbase, table, columnFamily, fieldMetadata) {

    const modelFieldNames = _.pluck(fieldMetadata, 'modelName');
    const hbaseFieldNames = _.pluck(fieldMetadata, 'hbaseName');
    const modelToHbaseField = _.indexBy(fieldMetadata, 'modelName');
    const hbaseFieldToModelField = _.indexBy(fieldMetadata, 'hbaseName');
    const getQualifierObjects = _.map(fieldMetadata, field =>
        ({name: field.hbaseName, type: field.type}));

    let HBaseModel = class HBaseModel {
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
                _.pick(data, ...modelFieldNames));
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
            _.each(getQualifierObjects, qual =>
                get.add(columnFamily, qual));

            return get;
        }

        static scanObject(options) {
            const scan = new hbase.Scan(options);

            _.each(getQualifierObjects, qual =>
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
    };

    HBaseModel.hbase = hbase;
    HBaseModel.columnFamily = columnFamily;
    HBaseModel.keyProperties = _.where(fieldMetadata, {isKeyProperty: true});
    HBaseModel.modelFieldNames = modelFieldNames;
    HBaseModel.hbaseFieldNames = hbaseFieldNames;
    HBaseModel.modelToHbaseField = modelToHbaseField;
    HBaseModel.hbaseFieldToModelField = hbaseFieldToModelField;
    HBaseModel.repository = new HBaseModelRepository(hbase, table, HBaseModel);

    return HBaseModel;
}

module.exports = HBaseModelFactory;