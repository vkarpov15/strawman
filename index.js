/**
 *  strawman.js
 *
 *  Created on: February 11, 2015
 *      Author: Valeri Karpov
 *
 *  Utility for generating stubbed out objects
 *
 */

'use strict';

var _ = require('underscore');
var Emitter = require('events').EventEmitter;

module.exports = function(functionDescriptions) {
  var ret = {};
  if (functionDescriptions._constructor) {
    var description = functionDescriptions._constructor;

    ret = function() {
      var args = Array.prototype.slice.call(arguments);
      if (description.argumentNames) {
        args = {};
        for (var i = 0; i < description.argumentNames.length; ++i) {
          args[description.argumentNames[i]] =
            (i < arguments.length) ? arguments[i] : undefined;
        }
      }

      ret._constructor.calls.push(args);
      process.nextTick(function() {
        ret._constructor.emitter.emit('called', args);
      });

      var result;
      if (typeof description.returns === 'function') {
        result = description.returns.apply(null, arguments);
      } else {
        result = description.returns;
      }

      ret._constructor.returned = ret._constructor.returned || [];
      ret._constructor.returned.push(result);
      return result;
    };
    ret._constructor = { calls: [], emitter: new Emitter() };
  }

  _.each(functionDescriptions, function(description, name) {
    var path = name.split('.');
    var obj = ret;
    for (var i = 0; i < path.length - 1; ++i) {
      if (!obj[path[i]]) {
        obj[path[i]] = {};
      }
      obj = obj[path[i]];
    }
    var lastPathChunk = path[path.length - 1];

    if (typeof description !== 'object') {
      obj[lastPathChunk] = description;
      if (typeof description === 'function') {
        obj[lastPathChunk] = function() {
          obj[lastPathChunk].calls.push(arguments);
          description.apply(null, arguments);
        };
        obj[lastPathChunk].calls = [];
        obj[lastPathChunk].emitter = new Emitter();
        _.each(['on', 'once', 'emit'], function(fn) {
          obj[lastPathChunk][fn] = function() {
            obj[lastPathChunk].emitter[fn].
              apply(obj[lastPathChunk].emitter, arguments);
          };
        });
      }
      return;
    }

    if (description.obj) {
      obj[lastPathChunk] = description.obj;
    } else {
      obj[lastPathChunk] = function() {
        var args = Array.prototype.slice.call(arguments);
        if (description.argumentNames) {
          args = {};
          for (var i = 0; i < description.argumentNames.length; ++i) {
            args[description.argumentNames[i]] =
              (i < arguments.length) ? arguments[i] : undefined;
          }
        }
        obj[lastPathChunk].calls.push(args);

        obj[lastPathChunk].emitter.emit('called', args);

        if (description.chain) {
          return ret;
        } else if (description.returns) {
          if (typeof description.returns === 'function') {
            return description.returns.apply(null, arguments);
          } else {
            return description.returns;
          }
        }
      };
      obj[lastPathChunk].calls = [];
      obj[lastPathChunk].emitter = new Emitter();
      _.each(['on', 'once', 'emit'], function(fn) {
        obj[lastPathChunk][fn] = function() {
          obj[lastPathChunk].emitter[fn].
            apply(obj[lastPathChunk].emitter, arguments);
        };
      });
    }
  });

  return ret;
};
