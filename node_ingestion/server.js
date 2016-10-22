/*eslint no-console: ["error", { allow: ["log"] }] */

"use strict";

var express,
    bodyParser,
    mongoDb,
    mongoClient,
    mongoUrl,
    uuid,
    instanceUuid,
    app,
    server,
    checkItemsCollection,
    insertDbItem,
    amqp,
    sendMessage,
    itemsCollectionName = "items";

try {
    uuid = require("uuid");
    instanceUuid = uuid.v4();
    express = require("express");
    bodyParser = require("body-parser");
    mongoDb = require("mongodb");
    amqp = require("amqplib/callback_api");
    mongoClient = mongoDb.MongoClient;
    app = express();
    mongoUrl = "mongodb://mongo:27017/ordinglc";
    app.use(bodyParser.json());

    sendMessage = function (itemId, successCallback, errorCallback) {
        amqp.connect("amqp://rabbitmq_bus", function (err, conn) {
            if (err) {
                errorCallback(err);
            } else {
                conn.createChannel(function (err, ch) {
                    var q = "ordinglc";
                    if (err) {
                        errorCallback(err);
                    } else {
                        try {
                            ch.assertQueue(q, {
                                durable: false
                            });
                            ch.sendToQueue(q, new Buffer.from(itemId));
                            console.log("Message sent with ID %s", itemId);
                            successCallback();
                        } catch (ex) {
                            errorCallback(err);
                        }
                    }
                });
            }
            setTimeout(function () {
                conn.close();
            }, 500);
        });
    };

    checkItemsCollection = function (database) {
        database.createCollection(itemsCollectionName, function (err, collection) {
            return;
        });
    };

    insertDbItem = function (item, successCallback, errorCallback) {
        mongoClient.connect(mongoUrl, function (err, database) {
            var collection;
            if (!database) {
                errorCallback("MongoDB database is null");
            } else {
                try {
                    checkItemsCollection();
                    collection = database.collection(itemsCollectionName);
                    collection.insertOne(item, {
                        w: 1
                    }, function (err, result) {
                        if (err) {
                            errorCallback(err);
                        } else {
                            console.log("Item added with ID %s", item.itemId);
                            successCallback(result);
                        }
                        database.close();
                    });
                } catch (ex) {
                    errorCallback(ex);
                } finally {
                    database.close();
                }
            }
        });
    };

    app.post("/addItem", function (req, res) {
        var itemId = uuid.v4();
        req.body.itemId = itemId;
        req.body.isProcessed = false;
        insertDbItem(req.body, function (result) {
            sendMessage(itemId, function () {
                res.status(201).send({
                    instanceId: instanceUuid,
                    itemId: itemId
                });
            }, function (error) {
                res.status(500).send({
                    error: error
                });
            });
        }, function (error) {
            res.status(500).send({
                error: error
            });
        });
    });

    app.get("/ping", function (req, res) {
        res.status(200).send({
            instanceId: instanceUuid
        });
    });

    /*app.get("/listUsers", function (req, res) {
        var collection;
        checkItemsCollection();
        collection = db.collection("users");
        collection.find().toArray(function (err, items) {
            res.status(201).send(createResult(items));
        });
    });*/

    server = app.listen(8080, function () {
        var host = server.address().address,
            port = server.address().port;
        console.log("Data ingestion server listening at http://%s:%s", host, port);
    });
} catch (error) {
    console.log("Error: %s", error);
}