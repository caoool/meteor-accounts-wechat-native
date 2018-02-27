// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by accounts-wechat-native.js.
import { name as packageName } from "meteor/caoool:accounts-wechat-native";

// Write your tests here!
// Here is an example.
Tinytest.add('accounts-wechat-native - example', function (test) {
  test.equal(packageName, "accounts-wechat-native");
});
