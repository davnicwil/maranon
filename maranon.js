var _ = require('lodash');

var Maranon = function(schema) {
  var caches = {};
  var thiz = {};

  function initEntityCache(type, typeName) {
    caches[typeName] = Cache(type);
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
    thiz['put' + typeNameFnSuffix] = buildPut(typeName);
    thiz['put' + typeNameFnSuffixPlural] = buildPuts(typeName);
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

  function buildPut(typeName) {
    return function(entity) {
      return put(typeName, entity);
    };
  }

  function buildPuts(typeName) {
    return function(entities) {
      return _.map(entities, buildPut(typeName));
    };
  }

  _.forOwn(schema, initEntityCache);

  thiz.wipe = function() {
    caches = {};
  };

  return thiz;
};

module.exports = Maranon;
