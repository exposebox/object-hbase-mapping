# object-hbase-mapping
An object-to-hbase mapper (like ORM is for SQL databases).
Writes (and reads) an object's fields as qualifiers in a given table, using a given column family.
Persistence layer based on  [`node-thrift2-hbase`](https://www.npmjs.com/package/node-thrift2-hbase).
---
## Usage
```javascript
const nodeThriftHbase = require('node-thrift2-hbase')(thriftHBaseConfig);
const ObjectHBaseMapping = require('object-habase-mapping');

const table = 'object_hbase_mapping:example_table';
const columnFamily = 'cf';
const fieldMetaData = [
    {modelName: 'm1', hbaseName: 'u1', type: 'string', isKeyProperty: true},
    {modelName: 'm2', hbaseName: 'u2', type: 'integer', isKeyProperty: true},
    {modelName: 'm3', hbaseName: 'u3', type: 'integer'},
];

const ModelClass = ObjectHBaseMapping(nodeThriftHbase, table, columnFamily, fieldMetadata)
```

- `hbase` - an instance of `node-thrift2-hbase`
- `table` - the name of the table in which this object is stored
- `columnFamily` - the name of the column family in which this object is stored
- `fieldMetadata` is a list of objects with the following properties:
    - `modelName` - name of the field in the object class (i.e. `instanceOfMyClass[modelName]` will hold this fields's value).
    - `hbaseName` - the qualifier name used in HBase to store this property, (i.e. this property will be stored in `columnFamily` in the qualifier `hbaseName`).
    - `type` - the type of the property's value, for serialization/deserialization purposes, as in `node-thrift2-hbase`.
    - `isKeyProperty` - boolean, set to true if this property is part of the row's key.

**Rowkey construction:** The row key is constructed by calling the static method `genKeyProperties` with the object data (see *static methods* below).

## HBaseModel
All HBase model classes created by this library extend a base class which supplies them with the following methods:
### static methods
+ `genKeyByProperties()`: `.join('.')`s the values of properties marked `isKeyProperty` by their order of appearance in `fieldMetadata` to generate an HBase row key.
### instance methods
+ `save()`: saves this object to HBase using the generated repository backend.
+ `load()`: load the object from HBase using this object as a prototype query.