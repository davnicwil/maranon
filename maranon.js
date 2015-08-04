var _ = require('lodash');

var Maranon = function(schema) {
  var caches = {};
  var subscriptions = {};
  var thiz = {};

  function init() {
    _.forOwn(schema, initTypeCache);
  }

  function initTypeCache(type, typeName) {
    caches[typeName] = Cache(type);
    subscriptions[typeName] = [];
    addGettersAndSettersFor(type, typeName);
  }

  function Cache(type) {
    var cache = {};
    cache.populated = false;
    cache.entities = {};
    cache.idProperty = type.idProperty;
    cache.indexes = {};
    _.each(type.indexOn, function(property) {
      cache.indexes[property] = {};
    });
    return cache;
  }

  function addGettersAndSettersFor(type, typeName) {
    var typeNameFnSuffix = _.capitalize(typeName);
    var typeNameFnSuffixPlural = typeNameFnSuffix + (type.pluralSuffix || 's');

    // add getters for specified id property
    thiz['get' + typeNameFnSuffix] = _.partial(get, typeName);
    thiz['get' + typeNameFnSuffixPlural] = _.partial(gets, typeName);
    thiz['getAll' + typeNameFnSuffixPlural] = _.partial(getAll, typeName);

    // add getters for specified indexOn properties (return single element)
    _.each(type.indexOn, _.partial(addIndexedGetForTypeAndProperty, typeNameFnSuffix, typeName));

    // add getters for specified getBy properties (return array of 0 or more elements)
    _.each(type.getBy, _.partial(addGetsForTypeAndProperty, typeNameFnSuffixPlural, typeName));

    // add setters
    thiz['put' + typeNameFnSuffix] = _.partial(putAndInvokeSubscribedActions, typeName);
    thiz['put' + typeNameFnSuffixPlural] = _.partial(putsAndInvokeSubscribedActions, typeName);
  }

  function addIndexedGetForTypeAndProperty(typeNameFnSuffix, typeName, property) {
    thiz['get' + typeNameFnSuffix + 'By' + _.capitalize(property)] = _.partial(getByIndexedProperty, typeName, property);
  }

  function addGetsForTypeAndProperty(typeNameFnSuffixPlural, typeName, property) {
    thiz['get' + typeNameFnSuffixPlural + 'By' + _.capitalize(property)] = _.partial(getsByProperty, typeName, property);
  }

  function getFromCache(cache, id) {
    return cache.entities[id];
  }

  function get(typeName, id) {
    return getFromCache(caches[typeName], id);
  }

  function gets(typeName, ids) {
    var cache = caches[typeName];
    return arrayResult(_.chain(ids)
                        .map(_.partial(getFromCache, cache))
                        .compact()
                        .value(), cache);
  }

  function getAll(typeName) {
    var cache = caches[typeName];
    return arrayResult(_.values(cache.entities), cache);
  }

  function arrayResult(arr, cache) {
    return arr.length === 0 && !cache.populated ? undefined : arr;
  }

  function getByIndexedProperty(typeName, property, value) {
    var cache = caches[typeName];
    var id = cache.indexes[property][value];
    return cache.entities[id];
  }

  function getsByProperty(typeName, property, value) {
    var cache = caches[typeName];
    return arrayResult(_.filter(cache.entities, looselyEquals(property, value)), cache);
  }

  function looselyEquals(property, value) {
    return function(obj) {
      return obj[property] == value;
    };
  }

  function put(cache, entity) {
    var id = entity[cache.idProperty];
    cache.entities[id] = entity;
    _.forOwn(cache.indexes, function(index, indexName) {
      index[entity[indexName]] = id;
    });
    return entity;
  }

  function putAndInvokeSubscribedActions(typeName, entity) {
    var cache = caches[typeName];
    var rtn = put(cache, entity);
    cache.populated = true;
    invokeSubscribedActions(typeName);
    return rtn;
  }

  function putsAndInvokeSubscribedActions(typeName, entities) {
    var cache = caches[typeName];
    var rtn = _.map(entities, _.partial(put, cache));
    cache.populated = true;
    invokeSubscribedActions(typeName);
    return rtn;
  }

  function invokeSubscribedActions(typeName) {
    _.invoke(subscriptions[typeName], 'action');
  }

  function subscribe(id) {
    return {
      toDo: function(action) {
        return {
          onUpdatesTo: function(typeName) {
            subscriptions[typeName].push({
              id: id,
              action: action
            });
          }
        };
      }
    };
  }

  function unsubscribe(id) {
    return {
      fromUpdatesTo: function(typeName) {
        subscriptions[typeName] = _.reject(subscriptions[typeName], looselyEquals('id', id));
      },
      fromAllUpdates: function() {
        _.each(_.keys(subscriptions), unsubscribe(id).fromUpdatesTo);
      }
    };
  }

  function wipe() {
    caches = {};
    subscriptions = {};
  }

  thiz.subscribe = subscribe;
  thiz.unsubscribe = unsubscribe;
  thiz.wipe = wipe;

  init();

  return thiz;
};

module.exports = Maranon;
