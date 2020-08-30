'user strict'

/*
/--------------------------------------------------------------------------
/ Object.prototype.delete
/--------------------------------------------------------------------------
/
/ This function provide delete method for any object to delete keys
/
/ Implemented
*/
if (!('delete' in Object.prototype)) {
    Object.defineProperty(Object.prototype, 'delete', {
        value: function() {
            for (var i = 0; i < arguments[0].length; i++) {
                delete this[arguments[0][i]];
            }
        }
    });
}

/*
/--------------------------------------------------------------------------
/ isExist
/--------------------------------------------------------------------------
/
/ Use to check key and value exist in array or not
/
/ Implemented
*/
function isExist(array, key, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] == value)
            return true;
    }
    return false;
}

/*
/--------------------------------------------------------------------------
/ deleteKeys
/--------------------------------------------------------------------------
/
/ This function use to delete unwanted keys
/
*/
function deleteKeys(obj, keys = []) {
    if (typeof obj == "object") {
        for (var key in obj) {
            if (obj[key] != null) {
                if (keys.includes(key)) {
                    delete obj[key];
                }
            } else {
                if (keys.includes(key)) {
                    delete obj[key];
                }
            }
            if (typeof obj[key] == "object") {
                deleteKeys(obj[key], keys);
            }
        }
    }
    return obj
}

/*
/--------------------------------------------------------------------------
/ filterQuery
/--------------------------------------------------------------------------
/
/ This function use to filter query params and convert into integer and remove empty or other value
/
/ In Progress
*/
function filterQuery(query = null, result = {}) {
    for (let [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            value = value.map(v => parseInt(v)).filter(v => Number.isInteger(v));
            if (value.length >= 1) {
                Object.assign(result, {
                    [key]: value
                });
            }
        }
    }
    return result;
}

/*
/--------------------------------------------------------------------------
/ nested
/--------------------------------------------------------------------------
/
/ This function use to convert simple mysql query response to nested array
/
/ Forked & Update
*/
function mapProjects(rows, options) {

    if (rows == null || options == null)
        return rows;

    var levels = options;
    // put similar objects in the same bucket (by table name)
    var buckets = new Array();

    for (var i = 0; i < levels.length; i++) {
        var result = new Array();

        var level = levels[i];
        var pkey = level.pkey;
        var table = level.table;
        var label = level.label || table;
        var virtuals = level.virtuals || [];

        for (var j = 0; j < rows.length; j++) {
            const object = rows[j][table];
            // check if object has key property
            if (object == null) {
                console.log("Error: couldn't find " + table + " property in mysql result set")
                continue;
            }
            virtuals.forEach((key) => {
                Object.assign(object, {
                    [key]: virtuals[key] || []
                });
            });
            // if object isn't in result array, then push it
            if (object[pkey] != null && !isExist(result, pkey, object[pkey])) {
                result.push(object)
            }
        }
        // Buckets should have two properties, a table name (to identify for relationships) and values.
        buckets.push({ table: table, values: result, label: label });
    }

    // we have similar objects in the same bucket
    // now, move lower level objects into related upper level objects where relationship key values match
    for (var i = buckets.length - 1; i >= 1; i--) {
        //CHECK TO SEE IF THIS BUCKET HAS THE FOREIGN KEY USED IN AN UPPER LEVEL
        if (levels[i].hasOwnProperty('map')) {
            for (var cf = 0; cf < levels[i].map.length; cf++) {
                // For each upper bucket
                for (var ub = i - 1; ub >= 0; ub--) {
                    if (levels[i].map[cf].table == levels[ub].table) {
                        // For each element in this table
                        for (var ct = 0; ct < buckets[i].values.length; ct++) {
                            // Go through each element in matching table
                            for (var utbv = 0; utbv < buckets[ub].values.length; utbv++) {
                                if (buckets[i].values[ct][levels[i].map[cf].col] == buckets[ub].values[utbv][levels[ub].pkey]) {
                                    //If there is a match, create an empty list with the table if it doesn't already exist
                                    if (!buckets[ub].values[utbv].hasOwnProperty(levels[i].label)) {
                                        //buckets[ub].values[utbv][defaults[0]] = 0; // Set Amount in Client Object
                                        buckets[ub].values[utbv][levels[i].label] = [];
                                    }

                                    delete buckets[i].values[ct][levels[i].map[cf].col];
                                    // Append object where relationship key values match
                                    buckets[ub].values[utbv][levels[i].label].push(buckets[i].values[ct]);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    // at the end, we have all the nested objects in the first bucket
    return buckets[0].values;
};

/*
/--------------------------------------------------------------------------
/ nestedMap
/--------------------------------------------------------------------------
/
/ This function use to generate multi layer child items and map with another array
/
/ Implemented
*/
function mapCostTypes(clients, items, id1 = 'ID', id2 = 'ID') {
    const root = [];
    clients.forEach(client => {
        client.Breakdown.map((project) => {
            project.Amount = 0;
            project.Breakdown = getNestedChildren(items.filter(i => i[id1] == project.ID));
            project = deleteKeys(project, ['Project_ID', 'Parent_Cost_Type_ID']);
            return project;
        });
        client.Breakdown.map((project) => {
            project.Amount = project.Breakdown.reduce((a, b) => a + b.Amount, 0)
            return project;
        })
        client.Amount = client.Breakdown.reduce((a, b) => a + b.Amount, 0)
        root.push(client);
    });
    return root;
}

/*
/--------------------------------------------------------------------------
/ getNestedChildren
/--------------------------------------------------------------------------
/
/ This function use to generate multi layer child items and map with another array
/
*/
function getNestedChildren(items, parent = null, id1 = 'ID', id2 = 'Parent_Cost_Type_ID', id3 = 'Project_ID') {
    var out = []
    for (var i in items) {
        if (items[i][id2] == parent) {
            var children = getNestedChildren(items, items[i][id1], id1, id2, id3)
            if (children.length) {
                items[i].Breakdown = children
            } else {
                items[i].Breakdown = [];
            }
            out.push(items[i])
        }
    }
    return out
}

const nested = {
    projects: [
        { table: 'c', pkey: 'ID', label: 'clients', virtuals: ['Amount', 'Breakdown'] },
        {
            table: 'p',
            pkey: 'ID',
            label: 'Breakdown',
            map: [{ table: 'c', col: 'Client_ID' }],
            virtuals: ['Amount', 'Breakdown'],
        },
    ]
}

module.exports = { filterQuery, mapProjects, mapCostTypes, getNestedChildren, nested };