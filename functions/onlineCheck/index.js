const request = require('request');
const { WebClient } = require('@slack/client');
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handle = (event, context, callback) => {

    // db scan

    const tableName = process.env.TABLE_NAME;

    var params = {
        TableName: tableName,
        ProjectionExpression: "id, channelName, onlineStatus"
    };

    docClient.scan(params, (err, data) => {
        if(err) {
            console.error("Error: ", JSON.stringify(err, null, 2));
            return;
        } else {
            data.Items.forEach((info) => {
                const id = info.id;
                const onlineStatus = info.onlineStatus;
                const channelName = info.channelName;
                console.log(channelName);

                var mentions = "@zych1751";

                // slackbot alarm
                request({
                    headers: {
                        "Client-ID": process.env.TWITCH_CLIENT_ID
                    },
                    uri: "https://api.twitch.tv/kraken/streams/" + id,
                }, (err, res, body) => {
                    var json = JSON.parse(body);
                    var getOnOffChangeParams = (str) => {
                        return {
                            TableName: tableName,
                            Key: {
                                "id": id
                            },
                            UpdateExpression: "set onlineStatus=:p",
                            ExpressionAttributeValues: {
                                ":p": str
                            },
                            ReturnValues: "UPDATED_NEW"
                        };
                    };

                    if(json["stream"] == null) {
                        if(onlineStatus === "on") {
                            var message = mentions + ' ' + channelName + " 방송 종료!";
                            sendSlackbotMessage(message);

                            const params = getOnOffChangeParams("off");
                            docClient.update(params, (err, data) => {
                                if(err) {
                                    console.error("Unable to update: ", JSON.stringify(err, null, 2));
                                } else {
                                    console.log("Update is success: ", JSON.stringify(data, null, 2));
                                }
                            });
                        }
                    } else {
                        if(onlineStatus == "off") {
                            var message = mentions + ' ' + channelName + " 방송 시작!";
                            sendSlackbotMessage(message);

                            const params = getOnOffChangeParams("on");
                            console.log(params);
                            docClient.update(params, (err, data) => {
                                if(err) {
                                    console.error("Unable to update: ", JSON.stringify(err, null, 2));
                                } else {
                                    console.log("Update is success: ", JSON.stringify(data, null, 2));
                                }
                            });
                        }
                    }
                });
            });
        }
    });

    callback(null, "end");
}

function sendSlackbotMessage(message) {
    const token = process.env.SLACKBOT_TOKEN;
    const web = new WebClient(token);
    const slackChannelId = process.env.SLACK_CHANNEL; // channel: _alarm

    web.chat.postMessage(slackChannelId, message, {
        "link_names": true,
        "username": "alarm",
        "icon_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/4019e22b8fec6c3a-profile_image-300x300.png"
    }).then((res) => {
    }).catch(console.error);
}
