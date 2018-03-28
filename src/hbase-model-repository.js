'use strict';
const _ = require('underscore');

const debug = require('debug')('object-hbase-mapping:hbase-model-repository');

class HBaseModelRepository {
    constructor(hbase, table, modelClass) {
        this.hbase = hbase;
        this.table = table;
        this.family = modelClass.columnFamily;
        this.modelClass = modelClass;
    }

    save(model) {
        debug('saving HBase model', model);
        let putObject = model.putObject();
        return this.hbase.putAsync(this.table, putObject);
    }

    load(rowkey) {
        return this.hbase.getAsync(this.table, this.modelClass.getObject(rowkey))
            .then(rowData =>
                this.modelClass.fromHBaseRowData(rowData.rowkey, rowData[this.family]))
            .tap(instance => debug('loaded model instance:', instance));
    }

    scan(options) {
        return this.hbase.scanAsync(this.table, this.modelClass.scanObject(options))
            .map(rowData => {
                debug('scanned rowData:', rowData);
                return this.modelClass.fromHBaseRowData(rowData.rowkey, rowData[this.family]);
            })
            .tap(instances => debug('scanned models:', instances));
    }

    createScanStream(options) {
        const scanOptions = Object.assign({family: this.family}, options);

        return this.hbase.createScanStream(
            this.table,
            this.modelClass.scanObject(scanOptions));
    }
}

module.exports = HBaseModelRepository;