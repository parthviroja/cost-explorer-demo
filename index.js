const express = require('express');
const path = require('path');
const mysql = require('mysql');
const app = express();

const config = require('./config.js');
const helper = require('./helper.js');

const conn = mysql.createConnection(config.database);

app.get('/', (req, res) => {
    res.send({ 'message': 'Cost Explorer Running' });
})

app.get('/cost-explorer', function(req, res) {

    const filters = helper.filterQuery(req.query, { clients: null, projects: null, cost_types: null });

    var Q1 = `SELECT * FROM clients as c JOIN projects p ON p.Client_ID = c.ID`;
    var Q2 = `SELECT ct.ID, ct.Parent_Cost_Type_ID, ct.Name, co.Project_ID, co.Amount FROM cost_types ct JOIN costs co ON co.Cost_Type_ID = ct.ID LEFT JOIN projects p ON p.ID = co.Project_ID`;

    if (filters.clients != null) {
        Q1 += ` WHERE c.ID IN (${filters.clients.join(',')})`;
        if (filters.projects != null) {
            Q1 += ` AND p.ID IN (${filters.projects.join(',')})`;
        }
    } else {
        if (filters.projects != null) {
            Q1 += ` WHERE p.ID IN (${filters.projects.join(',')})`;
        }
    }

    if (filters.cost_types != null) {
        Q2 += ` WHERE co.Cost_Type_ID IN (${filters.cost_types.join(',')})`;
    }

    Q2 += ' ORDER BY Parent_Cost_Type_ID ASC, ct.ID ASC, Project_ID ASC';

    conn.query({ sql: Q1, nestTables: true }, function(err, rows) {
        if (err) throw err;
        const clients = helper.mapProjects(rows, helper.nested.projects);
        conn.query({ sql: Q2, nestTables: false }, function(err, rows) {
            if (err) throw err;
            const tree = helper.mapCostTypes(clients, rows, 'Project_ID', 'Parent_Cost_Type_ID');
            res.send(tree);
        });
    });

});

app.listen(config.app.port, () => {
    console.log(`Cost Explorer Running on port ${config.app.port}`);
});