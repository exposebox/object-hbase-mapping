# object-hbase-mapping
An object-to-hbase mapper (like ORM is for SQL databases).
Writes (and reads) an object's fields as qualifiers in a given table, using a given column family.

hbase - an instance of `node-thrift2-hbase`
talbe - the name of the table in which this object is stored
columnFamily - the name of the column family in which this object is stored

field metadata format:
{modelName: 'address', hbaseName: 'user', type: 'string'},
modelName - name of the field in the object class
hbaseName - the qualifier name used in hbase
type - the type of value stored in the qualifier representing this field in HBase, as in `node-thrift2-hbase` 