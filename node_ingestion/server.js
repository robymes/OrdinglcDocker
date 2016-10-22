/*eslint no-console: ["error", { allow: ["log"] }] */

"use strict";

var express,
    bodyParser,
    mongoDb,
    mongoClient,
    mongoUrl,
    uuid,
    instanceUuid,
    db,
    app,
    server,
    checkItemsCollection,
    insertDbItem,
    createResult,
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
    console.log(mongoUrl);
    mongoClient.connect(mongoUrl, function (err, database) {
        if (!database) {
            throw "MongoDB database is null";
        }
        console.log("Connected correctly to MongoDB server");
        db = database;
    });
    app.use(bodyParser.json());

    sendMessage = function (itemId, successCallback, errorCallback) {
        amqp.connect("amqp://rabbitmq_bus", function (err, conn) {
            if (err) {
                errorCallback();
            } else {
                conn.createChannel(function (err, ch) {
                    var q = "ordinglc";
                    if (err) {
                        errorCallback();
                    } else {
                        ch.assertQueue(q, {
                            durable: false
                        });
                        ch.sendToQueue(q, new Buffer.from(itemId));
                        console.log("Message sent with ID %s", itemId);
                    }
                });
            }
            setTimeout(function () {
                conn.close();
            }, 500);
        });
    };

    createResult = function (res) {
        return {
            instanceId: instanceUuid,
            result: res
        };
    };

    checkItemsCollection = function () {
        db.createCollection(itemsCollectionName, function (err, collection) {
            return;
        });
    };

    insertDbItem = function (req, successCallback, errorCallback) {
        var collection;
        checkItemsCollection();
        collection = db.collection(itemsCollectionName);
        collection.insertOne(req.body, {
            w: 1
        }, function (err, result) {
            if (err) {
                errorCallback();
            } else {
                successCallback(result);
            }
        });
    };

    app.post("/addItem", function (req, res) {
        req.itemId = uuid.v4();
        req.isProcessed = false;
        insertDbItem(req, function (result) {
            sendMessage(req.itemId, function () {
                res.status(201).send(createResult(result));
            }, function () {
                res.status(500).send("Error");
            });
        }, function () {
            res.status(500).send("Error");
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