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
    thiz['put' + typeNameFnSuffix] = _.partial(putAndPublish, typeName);
    thiz['put' + typeNameFnSuffixPlural] = _.partial(putsAndPublish, typeName);
  }

  function addIndexedGetForTypeAndProperty(typeNameFnSuffix, typeName, property) {
    thiz['get' + typeNameFnSuffix + 'By' + _.capitalize(property)] = _.partial(getByIndexedProperty, typeName, property);
  }

  function addGetsForTypeAndProperty(typeNameFnSuffixPlural, typeName, property) {
    thiz['get' + typeNameFnSuffixPlural + 'By' + _.capitalize(property)] = _.partial(getsByProperty, typeName, property);
  }

  function get(typeName, id) {
    return caches[typeName].entities[id];
  }

  function gets(typeName, ids) {
    return _.map(ids, _.partial(get, typeName));
  }

  function getAll(typeName) {
    return _.values(caches[typeName].entities);
  }

  function getByIndexedProperty(typeName, property, value) {
    var cache = caches[typeName];
    var id = cache.indexes[property][value];
    return cache.entities[id];
  }

  function getsByProperty(typeName, property, value) {
    return _.filter(caches[typeName].entities, _.matchesProperty(property, value));
  }

  function put(typeName, entity) {
    var cache = caches[typeName];
    var id = entity[cache.idProperty];
    cache.populated = true;
    cache.entities[id] = entity;
    _.forOwn(cache.indexes, function(index, indexName) {
      index[entity[indexName]] = id;
    });
    return entity;
  }

  function putAndPublish(typeName, entity) {
    var rtn = put(typeName, entity);
    publishPut(typeName);
    return rtn;
  }

  function putsAndPublish(typeName, entities) {
    var rtn = _.map(entities, _.partial(put, typeName));
    publishPut(typeName);
    return rtn;
  }

  function publishPut(typeName) {
    _.invoke(subscriptions[typeName], 'action');
  }

  function subscribe(id, typeName, action) {
    subscriptions[typeName].push({
      id: id,
      action: action
    });
  }

  function unsubscribe(id, typeName) {
    subscriptions[typeName] = _.reject(subscriptions[typeName], _.matchesProperty('id', id));
  }

  function unsubscribeAll(id) {
    _.each(_.keys(subscriptions), _.partial(unsubscribe, id));
  }

  function wipe() {
    caches = {};
    subscriptions = {};
  }

  thiz.subscribe = subscribe;
  thiz.unsubscribe = unsubscribe;
  thiz.unsubscribeAll = unsubscribeAll;
  thiz.wipe = wipe;

  init();

  return thiz;
};

module.exports = Maranon;
